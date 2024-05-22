import {defs, tiny} from './examples/common.js'; 
import {
    Buffered_Texture,
    Color_Phong_Shader,
    Depth_Texture_Shader_2D,
    LIGHT_DEPTH_TEX_SIZE,
    Shadow_Textured_Phong_NM_Shader,
    Shadow_Textured_Phong_Shader
} from "./examples/shadow_shaders.js"; // bring in various modules and definitions from other JavaScript files

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture,
} = tiny; // extract several classes, functions, and constants from the tiny module

const {
    Cube,
    Cube_Normal,
    Square_Normal,
    Square,
    Subdivision_Sphere,
    Textured_Phong,
    Fake_Bump_Map,
    Phong_Shader,
    Textured_Phong_Normal_Map,
    Funny_Shader,
} = defs; // extracts specific shapes and shaders from the defs module

const original_box_size = 2;

class Base_Scene extends Scene {
    /**
     *  **Base_scene** is a Scene that can be added to any display canvas.
     *  Setup the shapes, materials, camera, and lighting here.
     */
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();
        this.hover = this.swarm = false;
        // define the shapes that will be used in the scene, loading them onto the GPU
        this.shapes = {
            'cube': new Cube_Normal(),
            'floor': new Square(),
            'person': new Cube(),
            'sphere': new Subdivision_Sphere(6),
            'chest': new Cube(),
        };

        // *** Materials
        // define the materials to be used for different objects. Each material is created with specific shader properties and textures
        this.materials = {
            plastic: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
            wall: new Material(new Textured_Phong_Normal_Map(),
                {
                    ambient: 0.2, diffusivity: 0.3, specularity: 0.3, color: hex_color("#FFFFFF"),
                    texture: new Texture("./assets/whitewall.jpg"),
                    normal: new Texture("./assets/whitewall.jpg")
                }),
            floor: new Material(new Shadow_Textured_Phong_Shader(1),
                {
                    ambient: 0.3, diffusivity: 0.2, specularity: 0.4,
                    color: hex_color("#aaaaaa"),
                    color_texture: new Texture("./assets/whitewall.jpg"),
                    light_depth_texture: null
                }),
            person: new Material(new Phong_Shader,
                {
                    ambient: 1, diffusivity: 0.5, color: hex_color("#FFFFFF")
                }),
            light_src: new Material(new Phong_Shader(), {
                color: color(1, 1, 1, 1), ambient: 1, diffusivity: 0, specularity: 0
            }),
            depth_tex: new Material(new Depth_Texture_Shader_2D(), {
                color: color(0, 0, .0, 1),
                ambient: 1, diffusivity: 0, specularity: 0, texture: null
            }),
            chest: new Material(new Textured_Phong(), {
                ambient: 1, diffusivity: 0, specularity: 0,
                texture: new Texture("./assets/chest.jpg")
            })
        };

        this.look_at_direction = vec4(1, 0, 0, 0); // Vector indicating the direction the camera is looking
        this.person_location = vec4(2, 0, -2, 0); // initial location of the person
        this.person_transformation = Mat4.identity() // transformation matrix for the person, including translation, rotation, and scaling
            .times(Mat4.translation(2, -0.5, -2))
            .times(Mat4.rotation(Math.PI / 2, 0, 1, 0))
            .times(Mat4.scale(0.3, 0.3, 0.3));
        this.camera_transformation = Mat4.identity() // transformation matrix for the camera
            .times(Mat4.rotation(Math.PI / 2, 0, 1, 0))
            .times(Mat4.translation(-2, -0.8, 2));

        this.goal_position = vec3(34, 0, -10); // position of the goal chest in the game
        this.treasure_base_transform = Mat4.translation(...this.goal_position)
            .times(Mat4.scale(0.5, 0.5, 0.5)); // transformation for the treasure
    }

    display(context, program_state) {
        // display():  Called once per frame of animation to render the scene. Here, the base class's display only does
        // some initial setup.

        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(Mat4.translation(-20, -10, -50));
        }
        program_state.projection_transform = Mat4.perspective(
            Math.PI / 2.5, context.width / context.height, 0.01, 100);

    }
}

export class Maze extends Base_Scene {
    /**
     * This Scene object can be added to any display canvas.
     * We isolate that code so it can be experimented with on its own.
     * This gives you a very small code sandbox for editing a simple scene, and for
     * experimenting with matrix transformations.
     */
    constructor() { // initialize the maze-specific properties and configurations
        super();
        this.get_coords(); //  fetches the coordinates necessary for the maze
        this.still_lighting = false; // boolean flag for lighting effects
        this.map_plane = []; 
        this.init_ok = false; // flag to check if the initialization is done
        const offsets = this.get_offsets(1) // fetches the offsets for creating the 2D projection of the maze
        let res = []; // transforming 3D coordinates of maze walls into 2D coordinates on a plane
        for (let c of this.box_coord) {
            let resc = [];
            const center = vec(original_box_size * c[0], original_box_size * c[2])
            for (let offset of offsets) {
                resc.push(vec(
                    center[0] + offset[0],
                    center[1] + offset[1]
                ))
            }
            res.push(resc);
        }
        this.map_plane = res // stores projected 2d coords of maze walls
    }

    // generates a list of 2D vectors representing the corners of a square centered around a given base value
    get_offsets(base) {
        // this represents vectors for the four corners of a square
        return [
            vec(base, -1 * base),
            vec(base, base),
            vec(-1 * base, base),
            vec(-1 * base, -1 * base)
        ];
    }

    // Computes the coordinates of the tips of a bounding box around the person in the maze
    get_person_box_tips(hypothetic_person_position) {
        const person_location = hypothetic_person_position ? hypothetic_person_position : hypothetic_person_position; // Uses the hypothetical position
        const base = 0.5 * 0.3; // defines half the size of the person's bounding box
        const offsets = this.get_offsets(base); // uses the offsets to determine the corners of the bounding box
        let res = []; // add offsets to the person's location to compute the bounding box tips
        for (let offset of offsets) {
            res.push(
                vec(person_location[0] + offset[0], -person_location[2] - offset[1])
            )
        }
        return res
    }

    // calculates the 2D coordinates of the corners of goal chest given its location in 3D space, projected onto the 2D plane
    get_wall_brick_box_tips(box_location) { // pass in 3D coordinates of the box
        const base = 1; // the size of the box is set to 1
        const offsets = this.get_offsets(base); // uses get_offsets(base) to get the corners of the box relative to its center
        // For each offset, calculate the 2D coordinates by adding the offset to the box's location
        let res = [];
        for (let offset of offsets) {
            res.push(
                vec(box_location[0] + offset[0], -box_location[2] - offset[1])
            )
        }
        return res // the coordinates are stored in the res array
    }

    // check for collision between two 1D intervals
    box_collide_1d(box1, box2) { // box1, box2: each represents an interval with a minimum and maximum value
        // Extracts the minimum and maximum values of both intervals
        const xmin1 = box1[0];
        const xmax1 = box1[1];
        const xmin2 = box2[0];
        const xmax2 = box2[1];
        return xmax1 >= xmin2 && xmax2 >= xmin1; // if the intervals overlap, return true
    }

    // check for collision between two 2D boxes
    box_collide_2d(box1, box2) {
        // For both boxes, calculate the minimum and maximum x and y values by iterating through the corner coordinates

        const xmin1 = Math.min(...box1.map(c => c[0]));
        const xmax1 = Math.max(...box1.map(c => c[0]));
        const ymin1 = Math.min(...box1.map(c => c[1]));
        const ymax1 = Math.max(...box1.map(c => c[1]));
        const xmin2 = Math.min(...box2.map(c => c[0]));
        const xmax2 = Math.max(...box2.map(c => c[0]));
        const ymin2 = Math.min(...box2.map(c => c[1]));
        const ymax2 = Math.max(...box2.map(c => c[1]));

        return this.box_collide_1d([xmin1, xmax1], [xmin2, xmax2]) &&
            this.box_collide_1d([ymin1, ymax1], [ymin2, ymax2]) // determine if the boxes overlap in both the x and y dimensions by using the box_collide_1d method
    }

    // defining the coordinates of the boxes in the maze
    get_coords() {
        // initializes the box_coord array with the coordinates of the boxes in the maze
        this.box_coord = [
            [0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0], [4, 0, 0], [5, 0, 0],
            [6, 0, 0], [7, 0, 0], [8, 0, 0], [9, 0, 0], [10, 0, 0], [11, 0, 0],
            [12, 0, 0], [13, 0, 0], [14, 0, 0], [15, 0, 0], [16, 0, 0], [17, 0, 0],
            [18, 0, 0], [19, 0, 0], [20, 0, 0], [10, 0, 1], [14, 0, 1], [2, 0, 2],
            [3, 0, 2], [4, 0, 2], [5, 0, 2], [6, 0, 2], [7, 0, 2], [8, 0, 2],
            [10, 0, 2], [12, 0, 2], [13, 0, 2], [14, 0, 2], [16, 0, 2], [17, 0, 2],
            [18, 0, 2], [2, 0, 3], [4, 0, 3], [8, 0, 3], [16, 0, 3], [2, 0, 4],
            [4, 0, 4], [6, 0, 4], [7, 0, 4], [8, 0, 4], [9, 0, 4], [10, 0, 4],
            [11, 0, 4], [12, 0, 4], [13, 0, 4], [14, 0, 4], [16, 0, 4], [18, 0, 4],
            [19, 0, 4], [4, 0, 5], [8, 0, 5], [16, 0, 5], [18, 0, 5], [1, 0, 6],
            [2, 0, 6], [3, 0, 6], [4, 0, 6], [6, 0, 6], [8, 0, 6], [9, 0, 6],
            [10, 0, 6], [12, 0, 6], [14, 0, 6], [15, 0, 6], [16, 0, 6], [17, 0, 6],
            [18, 0, 6], [4, 0, 7], [6, 0, 7], [12, 0, 7], [18, 0, 7], [2, 0, 8],
            [3, 0, 8], [4, 0, 8], [5, 0, 8], [6, 0, 8], [7, 0, 8], [8, 0, 8],
            [9, 0, 8], [10, 0, 8], [12, 0, 8], [14, 0, 8], [15, 0, 8], [16, 0, 8],
            [17, 0, 8], [18, 0, 8], [2, 0, 9], [8, 0, 9], [12, 0, 9], [2, 0, 10],
            [4, 0, 10], [6, 0, 10], [7, 0, 10], [8, 0, 10], [10, 0, 10], [11, 0, 10],
            [12, 0, 10], [13, 0, 10], [14, 0, 10], [15, 0, 10], [16, 0, 10], [17, 0, 10],
            [18, 0, 10], [19, 0, 10], [4, 0, 11], [14, 0, 11], [16, 0, 11], [2, 0, 12],
            [3, 0, 12], [4, 0, 12], [6, 0, 12], [7, 0, 12], [8, 0, 12], [10, 0, 12],
            [11, 0, 12], [12, 0, 12], [14, 0, 12], [16, 0, 12], [17, 0, 12], [18, 0, 12],
            [2, 0, 13], [4, 0, 13], [8, 0, 13], [12, 0, 13], [1, 0, 14], [2, 0, 14],
            [4, 0, 14], [5, 0, 14], [6, 0, 14], [7, 0, 14], [8, 0, 14], [9, 0, 14],
            [10, 0, 14], [11, 0, 14], [12, 0, 14], [13, 0, 14], [14, 0, 14], [15, 0, 14],
            [16, 0, 14], [18, 0, 14], [19, 0, 14], [4, 0, 15], [8, 0, 15], [2, 0, 16],
            [3, 0, 16], [4, 0, 16], [6, 0, 16], [7, 0, 16], [8, 0, 16], [9, 0, 16],
            [10, 0, 16], [11, 0, 16], [12, 0, 16], [14, 0, 16], [15, 0, 16], [16, 0, 16],
            [18, 0, 16], [19, 0, 16], [10, 0, 17], [16, 0, 17], [2, 0, 18], [3, 0, 18],
            [4, 0, 18], [5, 0, 18], [6, 0, 18], [7, 0, 18], [8, 0, 18], [10, 0, 18],
            [12, 0, 18], [13, 0, 18], [14, 0, 18], [16, 0, 18], [17, 0, 18], [18, 0, 18],
            [19, 0, 18], [8, 0, 19], [12, 0, 19], [0, 0, 20], [0, 0, 0], [20, 0, 0],
            [1, 0, 20], [0, 0, 1], [20, 0, 1], [2, 0, 20], [0, 0, 2], [20, 0, 2],
            [3, 0, 20], [0, 0, 3], [20, 0, 3], [4, 0, 20], [0, 0, 4], [20, 0, 4],
            [5, 0, 20], [0, 0, 5], [20, 0, 5], [6, 0, 20], [0, 0, 6], [20, 0, 6],
            [7, 0, 20], [0, 0, 7], [20, 0, 7], [8, 0, 20], [0, 0, 8], [20, 0, 8],
            [9, 0, 20], [0, 0, 9], [20, 0, 9], [10, 0, 20], [0, 0, 10], [20, 0, 10],
            [11, 0, 20], [0, 0, 11], [20, 0, 11], [12, 0, 20], [0, 0, 12], [20, 0, 12],
            [13, 0, 20], [0, 0, 13], [20, 0, 13], [14, 0, 20], [0, 0, 14], [20, 0, 14],
            [15, 0, 20], [0, 0, 15], [20, 0, 15], [16, 0, 20], [0, 0, 16], [20, 0, 16],
            [17, 0, 20], [0, 0, 17], [20, 0, 17], [18, 0, 20], [0, 0, 18], [20, 0, 18],
            [19, 0, 20], [0, 0, 19], [20, 0, 19], [20, 0, 20], [0, 0, 20], [20, 0, 20],
        ]
    }

    // check if the player's new position (after movement) collides with the goal position
    check_winning_condition(new_person_location_tips) { // take in the projected 2D coordinates of the player's new position
        if (this.box_collide_2d(
            new_person_location_tips,
            this.get_wall_brick_box_tips(this.goal_position) // use box_collide_2d method to check if the player's new position collides with the goal position
        )) {
            if (confirm("You won! Click 'OK' to restart.")) {
                location.reload();
            }
            return false;
        }
        return true
    }

    // check if the player's new position collides with any wall in the maze
    check_person_colliding_wall(new_person_location_tips) { // take in the projected 2D coordinates of the player's new position
        for (let i = 0; i < this.map_plane.length; i++) { // iterates through each projected wall in the map_plane
            const cur_square = this.map_plane[i];
            if (this.box_collide_2d(
                cur_square,
                new_person_location_tips // box_collide_2d to check if the player's new position collides with the current wall
            )) {
                return false; // If a collision is detected with any wall, returns false
            }
        }
        return true;
    }

    // creating the control panel for the maze game
    make_control_panel() {
        this.key_triggered_button("Rotate Left", ["a"], () => {
            this.look_at_direction = Mat4.rotation(Math.PI / 16, 0, 1, 0)
                .times(this.look_at_direction);
            this.person_transformation =
                Mat4.translation(
                    this.person_location[0],
                    this.person_location[1],
                    this.person_location[2]
                )
                    .times(Mat4.rotation(Math.PI / 16, 0, 1, 0))
                    .times(Mat4.translation(
                        -1 * this.person_location[0],
                        -1 * this.person_location[1],
                        -1 * this.person_location[2]
                    )).times(this.person_transformation);
            this.camera_transformation =
                this.camera_transformation.times(
                    Mat4.translation(
                        this.person_location[0],
                        this.person_location[1],
                        this.person_location[2]
                    )
                        .times(Mat4.rotation(-Math.PI / 16, 0, 1, 0))
                        .times(Mat4.translation(
                            -1 * this.person_location[0],
                            -1 * this.person_location[1],
                            -1 * this.person_location[2]
                        )));
        });

        this.key_triggered_button("Rotate Right", ["d"], () => {
            this.look_at_direction = Mat4.rotation(-Math.PI / 16, 0, 1, 0)
                .times(this.look_at_direction);
            this.person_transformation =
                Mat4.translation(
                    this.person_location[0],
                    this.person_location[1],
                    this.person_location[2]
                )
                    .times(Mat4.rotation(-Math.PI / 16, 0, 1, 0))
                    .times(Mat4.translation(
                        -1 * this.person_location[0],
                        -1 * this.person_location[1],
                        -1 * this.person_location[2]
                    )).times(this.person_transformation);
            this.camera_transformation =
                this.camera_transformation.times(
                    Mat4.translation(
                        this.person_location[0],
                        this.person_location[1],
                        this.person_location[2]
                    )
                        .times(Mat4.rotation(Math.PI / 16, 0, 1, 0))
                        .times(Mat4.translation(
                            -1 * this.person_location[0],
                            -1 * this.person_location[1],
                            -1 * this.person_location[2]
                        )));
        });

        this.key_triggered_button("Move", ["w"], () => {
            const scaled_look_at_direction = this.look_at_direction.times(0.12) // scaled by a factor of 0.12 to control the speed of movement
            const new_person_transformation =
                Mat4.translation( // update the tf matrix for the player by translating it in the direction of scaled_look_at_direction
                    scaled_look_at_direction[0],
                    scaled_look_at_direction[1],
                    scaled_look_at_direction[2]
                ).times(this.person_transformation);
            const new_camera_transformation = this.camera_transformation.times(Mat4.translation(
                -1 * scaled_look_at_direction[0], // update camera by translating it in the opposite direction of scaled_look_at_direction, effectively moving the camera with the player
                -1 * scaled_look_at_direction[1],
                -1 * scaled_look_at_direction[2]
            ));
            const new_person_location = this.person_location.plus(scaled_look_at_direction); // calculates the new position of the player character
            let ok = true;
            const new_person_location_tips = this.get_person_box_tips(new_person_location);

            ok = ok && this.check_person_colliding_wall(new_person_location_tips); // check if the new position collides with any walls
            ok = ok && this.check_winning_condition(new_person_location_tips); // check if the new position satisfies the winning condition 

            if (ok) { // If both collision and winning condition checks pass, update the player's tf, camera tf, and location to the new values
                this.person_transformation = new_person_transformation;
                this.camera_transformation = new_camera_transformation;
                this.person_location = new_person_location;
            }
        });

        this.key_triggered_button("Back", ["s"], () => {
            const scaled_look_at_direction = this.look_at_direction.times(0.12)
            const new_person_transformation =
                Mat4.translation(
                    -1 * scaled_look_at_direction[0],
                    -1 * scaled_look_at_direction[1],
                    -1 * scaled_look_at_direction[2]
                ).times(this.person_transformation);
            const new_camera_transformation = this.camera_transformation.times(Mat4.translation(
                scaled_look_at_direction[0],
                scaled_look_at_direction[1],
                scaled_look_at_direction[2]
            ));
            const new_person_location = this.person_location.plus(scaled_look_at_direction.times(-1));
            let ok = true;
            const new_person_location_tips = this.get_person_box_tips(new_person_location);


            ok = ok && this.check_person_colliding_wall(new_person_location_tips);
            ok = ok && this.check_winning_condition(new_person_location_tips);

            if (ok) {
                this.person_transformation = new_person_transformation;
                this.camera_transformation = new_camera_transformation;
                this.person_location = new_person_location;
            }
        });

    }

    // draw walls at the specified position (x, y, z) in the scene
    draw_box(context, program_state, model_transform, x, y, z) {
        model_transform = Mat4.identity().times(Mat4.translation(x, y, z));
        return model_transform;
    }

    // draw the floor of the maze
    draw_floor(context, program_state) {
        const floor_transformation = Mat4.identity()
            .times(Mat4.translation(20, -1, -20))
            .times(Mat4.scale(20, 0.2, 20));
        this.shapes.cube.draw(context, program_state, floor_transformation, this.materials.floor);
    }

    // draw the player character in the maze
    draw_person(context, program_state) {
        program_state.set_camera(this.camera_transformation) // sets the camera transformation to the current camera transformation
        this.shapes.person.draw(context, program_state, this.person_transformation, this.materials.person); // draw the player character shape using its transformation (person_transformation) and material
    }

    // initializes texture buffers for shadow mapping in WebGL
    texture_buffer_init(gl) {
        // Create a new depth texture (lightDepthTexture) and binds it to the Buffered_Texture
        this.lightDepthTexture = gl.createTexture();
        // Set this depth texture to the light_depth_texture property of the wall and floor materials (defined in this.materials)
        this.light_depth_texture = new Buffered_Texture(this.lightDepthTexture);
        this.materials.wall.light_depth_texture = this.light_depth_texture;
        this.materials.floor.light_depth_texture = this.light_depth_texture;

        // Create a framebuffer (lightDepthFramebuffer) for rendering depth information
        this.lightDepthTextureSize = LIGHT_DEPTH_TEX_SIZE;
        // Attach the depth texture to this framebuffer
        gl.bindTexture(gl.TEXTURE_2D, this.lightDepthTexture);

        // configures a depth texture (lightDepthTexture) and attaches it to a framebuffer (lightDepthFramebuffer) as a depth attachment
        gl.texImage2D( // Specifies the properties of the depth texture
            gl.TEXTURE_2D,      // target textture
            0,                  // Specifies the level of detail. Level 0 is the base image level.
            gl.DEPTH_COMPONENT, //  Specifies the internal format of the texture. Here, it indicates a depth component texture.
            this.lightDepthTextureSize,   // Specifies the width of the texture.
            this.lightDepthTextureSize,   // Specifies the height of the texture.
            0,                  // Specifies the border of the texture.
            gl.DEPTH_COMPONENT, // Specifies the format of the pixel data.
            gl.UNSIGNED_INT,    // Specifies the data type of the pixel data.
            null);              // Specifies the image data. Here, it's set to null since we're only allocating memory.
        
        // Sets parameters for the texture, such as filtering and wrapping modes.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); // Sets the magnification and minification filters to gl.NEAREST, indicating that the nearest texel should be used.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); // Sets the wrapping modes for the texture to gl.CLAMP_TO_EDGE, which clamps texture coordinates to the range [0, 1].
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        
        this.lightDepthFramebuffer = gl.createFramebuffer(); // Creates a new framebuffer object.
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.lightDepthFramebuffer); // Binds the framebuffer.
        gl.framebufferTexture2D( // Attaches the depth texture to the framebuffer as a depth attachment.
            gl.FRAMEBUFFER,       // Specifies the target framebuffer.
            gl.DEPTH_ATTACHMENT,  // Specifies the attachment point. Here, it indicates that the texture will be used as a depth buffer.
            gl.TEXTURE_2D,        // Specifies the type of the texture.
            this.lightDepthTexture,         //  Specifies the texture to attach.
            0);                   // Specifies the level of detail.
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); // unbinds the framebuffer to return to the default framebuffer.


        // Creates an unused color texture (unusedTexture) with the same size as the depth texture.
        this.unusedTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.unusedTexture);
        // Specifies properties of the color texture like filtering and wrapping.
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            this.lightDepthTextureSize,
            this.lightDepthTextureSize,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null,
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

       // Attaches this color texture to the framebuffer as a color attachment.
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,        // target
            gl.COLOR_ATTACHMENT0,  // attachment point
            gl.TEXTURE_2D,         // texture target
            this.unusedTexture,         // texture
            0);                    // mip level
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); // cleanup: Unbinds the framebuffer.
    }


    // render the scene by drawing boxes representing walls and a floor
    render_scene(context, program_state, shadow_pass, draw_light_source = false, draw_shadow = false) {
        let light_position = this.global_sun_position;
        let light_color = this.sun_light_color;
        const t = program_state.animation_time;
        program_state.draw_shadow = draw_shadow;
        let box_model_transform = Mat4.identity();

        // Light source rendering:
        // If draw_light_source is true and it's the shadow pass, draw a sphere representing the light source using the shapes.sphere object
        if (draw_light_source && shadow_pass) {
            this.shapes.sphere.draw(context, program_state,
                Mat4.translation(light_position[0], light_position[1], light_position[2]).times(Mat4.scale(.5, .5, .5)),
                this.materials.light_src.override({color: light_color}));
        }
        
        // Box rendering:
        // iterate over each box coordinate in this.box_coord
        for (let i = 0; i < this.box_coord.length; i++) {
            const x = original_box_size * this.box_coord[i][0]; // calculate the coordinates (x, y, z) of each box based on original_box_size
            const y = original_box_size * this.box_coord[i][1];
            const z = -original_box_size * this.box_coord[i][2];
            box_model_transform = this.draw_box(context, program_state, box_model_transform, x, y, z); // call draw_box function to obtain the model transformation for the current box
            this.shapes.cube.draw(context, program_state, box_model_transform, this.materials.wall); // draw a cube representing a wall using the shapes.cube object

        }
        this.draw_floor(context, program_state, shadow_pass); // call draw_floor function to draw the floor

    }

    // move box up and down at the same position
    draw_chest(context, program_state) {
        const t = program_state.animation_time / 1000;
        const max_degree = .5 * Math.PI;
        const a = max_degree / 2;
        const b = max_degree / 2;
        const w = 2;
        const cur_degree = a + b * Math.sin(w * t);

        const box_transform =
            Mat4.translation(0, cur_degree, 0)
                .times(this.treasure_base_transform);
        this.shapes.chest.draw(context, program_state, box_transform, this.materials.chest);
    }

    
    display(context, program_state) {
        super.display(context, program_state);

        const t = program_state.animation_time;
        const gl = context.context;
        if (!this.init_ok) {
            const ext = gl.getExtension('WEBGL_depth_texture');
            if (!ext) {
                return alert('need WEBGL_depth_texture');  
            }
            this.texture_buffer_init(gl);

            this.init_ok = true;
        }
        if (this.still_lighting) {
            this.global_sun_position = vec4(10, 5, 0, 1);
        } else {
            this.global_sun_position = vec4(15 - 5 * Math.cos(t / 4500), 5 * Math.sin(t / 4500), 2, 1);
        }
        this.sun_light_color = hex_color("#ffffff");
        this.light_view_target = vec4(20, 0, -20, 1);
        this.light_field_of_view = 170 * Math.PI / 180;
        program_state.lights = [new Light(this.global_sun_position, this.sun_light_color, 10000)];
        this.light_view_target = vec4(10, 0, -10, 1);
        this.light_field_of_view = 170 * Math.PI / 180;
        program_state.lights = [new Light(this.global_sun_position, this.sun_light_color, (Math.sin(t / 4500) > 0 || this.still_lighting) ? 10000 : 0)]
        const light_view_mat = Mat4.look_at(
            vec3(this.global_sun_position[0], this.global_sun_position[1], this.global_sun_position[2]),
            vec3(this.light_view_target[0], this.light_view_target[1], this.light_view_target[2]),
            vec3(0, 1, 0), 
        );
        const light_proj_mat = Mat4.perspective(this.light_field_of_view, 1, 0.5, 500);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.lightDepthFramebuffer);
        gl.viewport(0, 0, this.lightDepthTextureSize, this.lightDepthTextureSize);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        program_state.light_view_mat = light_view_mat;
        program_state.light_proj_mat = light_proj_mat;
        program_state.light_tex_mat = light_proj_mat;
        program_state.view_mat = light_view_mat;
        program_state.projection_transform = light_proj_mat;
        this.render_scene(context, program_state, false, false, false);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        program_state.view_mat = program_state.camera_inverse;
        program_state.projection_transform = Mat4.perspective(Math.PI / 2.5, context.width / context.height, 0.01, 100);
        this.render_scene(context, program_state, true, true, true);

        let model_transform = Mat4.identity();
        for (let i = 0; i < this.box_coord.length; i++) {
            const x = original_box_size * this.box_coord[i][0];
            const y = original_box_size * this.box_coord[i][1];
            const z = -original_box_size * this.box_coord[i][2];
            model_transform = this.draw_box(context, program_state, model_transform, x, y, z);
        }

        this.draw_person(context, program_state);
        this.draw_chest(context, program_state);
    }
}