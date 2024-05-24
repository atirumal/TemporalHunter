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
    Rounded_Capped_Cylinder,
    Textured_Phong,
    Fake_Bump_Map,
    Phong_Shader,
    Textured_Phong_Normal_Map,
    Funny_Shader,
    Cylindrical_Tube,
} = defs; // extracts specific shapes and shaders from the defs module

const original_box_size = 2;

class Projectile {
    constructor(currMatrix, speed, dir) {
        this.initial = currMatrix;
        this.model_transform = currMatrix.times(Mat4.scale(.1, .1, .1));;
      //  this.direction = currMatrix.times(vec4(1, 0, 0, 0)).to3();
        this.direction = dir;
        this.speed = speed;
        this.start = 30;
        this.timer = this.start;
    }

    update(dt) {
       // console.log("hi");
        // Update position based on direction and speed
        this.model_transform = this.model_transform.times(Mat4.translation(...this.direction.times(0.8*dt)));
    }

    render(context, program_state, material, shapes, gunMaterial, currMat) {
        // Render the projectile using the capped cylinder shape
        if(this.timer > 0){
            this.draw_gun(context, program_state, shapes, gunMaterial, currMat);
            this.timer = this.timer - 1;
        }
        shapes.bullet.draw(context, program_state, this.model_transform, material);
        
    }

    draw_gun(context, program_state, shapes, gunMaterial, currMat){
        let downTr = 0;
        if(this.timer <= (this.start/2)){
            downTr = 0.28 - this.timer/(this.start / 0.56);
        }
        const gun_transform = Mat4.translation(-0.04,-0.06 - downTr,0.1).times(currMat
            .times(Mat4.rotation(-Math.PI/3.2, 1,0,0).
        times(Mat4.rotation(-Math.PI/1.8, 0,1,0)).
        times(Mat4.rotation(Math.PI/9, 1,0,0)).
        times(Mat4.scale(0.04, 0.1, 0.03))));
        shapes.cube.draw(context, program_state, gun_transform, gunMaterial);


        const gun_transform2 = Mat4.translation(-0.125,-0.18 - downTr,0.13).times(currMat.
        times(Mat4.rotation(0, 1,0,0).
        times(Mat4.rotation(Math.PI/9, 0,1,0)).
        times(Mat4.rotation(0, 1,0,0)).
        times(Mat4.scale(0.04, 0.1, 0.01))));
        shapes.cube.draw(context, program_state, gun_transform2, gunMaterial);
    }
}


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
            'bullet': new Rounded_Capped_Cylinder(150, 50),
            'rectangle': new Cylindrical_Tube(4, 80),


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
            }),
            bullet: new Material(new Textured_Phong(),{
            
            }),
            gun: new Material(new Textured_Phong(),{
                ambient: 1, diffusivity: 0.8, specularity: 0,
                texture: new Texture("./assets/weapon.jpg"),
            }),


        };

        this.gun_active = false;

        this.look_at_direction = vec4(1, 0, 0, 0); // Vector indicating the direction the camera is looking
        this.person_location = vec4(2, 0, -2, 0); // initial location of the person
        this.person_transformation = Mat4.identity() // transformation matrix for the person, including translation, rotation, and scaling
            .times(Mat4.translation(2, -0.5, -2))
            .times(Mat4.rotation(Math.PI / 2, 0, 1, 0))
            .times(Mat4.scale(0.3, 0.3, 0.3));
        this.camPosition = vec3(2, 0.8, -2);
        this.lookatpoint = vec3(10, 0.8, -2);
        this.upvector = vec3(0, 1, 0);
        this.camera_transformation = Mat4.identity(); // transformation matrix for the camera
        this.camera_transformation.set(Mat4.look_at(this.camPosition, this.lookatpoint, this.upvector));
            //.times(Mat4.rotation(Math.PI / 2, 0, 1, 0))
            //.times(Mat4.translation(-2, -0.8, 2));
        

        this.goal_position = vec3(34, 0, -10); // position of the goal chest in the game
        this.treasure_base_transform = Mat4.translation(...this.goal_position)
            .times(Mat4.scale(0.5, 0.5, 0.5)); // transformation for the treasure
        this.bullet_transform = Mat4.translation(0,1,-5).times(this.camera_transformation).times(Mat4.scale(0.8,0.8,0.8));
    }

    display(context, program_state) {
        // display():  Called once per frame of animation to render the scene. Here, the base class's display only does
        // some initial setup.

        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (context.scratchpad.controls) {
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
        this.proj = null;
        this.projList = [];
        this.freeze = false;
        this.projDelay = 0;
        
        //movement stuff 
        this.tick = 0;
        const data_members = {
            roll: 0, look_around_locked: true,
            thrust: vec3(0, 0, 0), pos: vec3(0, 0, 0), z_axis: vec3(0, 0, 0),
            radians_per_frame: 1 / 200, meters_per_frame: 20, speed_multiplier: 1
        };
        Object.assign(this, data_members);

        this.mouse_enabled_canvases = new Set();
        this.will_take_over_graphics_state = true;
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
            
            [10, 0, 2], [12, 0, 2], [13, 0, 2], [14, 0, 2], [16, 0, 2], [17, 0, 2],
            [18, 0, 2], [2, 0, 3], [4, 0, 3], [8, 0, 3], [16, 0, 3], [2, 0, 4],
            [4, 0, 4], [6, 0, 4], [7, 0, 4], [8, 0, 4], [9, 0, 4], [10, 0, 4],
            [11, 0, 4], [12, 0, 4], [13, 0, 4], [14, 0, 4], [16, 0, 4], [18, 0, 4],
            [19, 0, 4], [4, 0, 5], [8, 0, 5], [16, 0, 5], [18, 0, 5], [1, 0, 6],
            
            [10, 0, 6], [12, 0, 6], [14, 0, 6], [15, 0, 6], [16, 0, 6], [17, 0, 6],
            
            [3, 0, 8], [4, 0, 8], [5, 0, 8], [6, 0, 8], [7, 0, 8], [8, 0, 8],
            [9, 0, 8], [10, 0, 8], [12, 0, 8], [14, 0, 8], [15, 0, 8], [16, 0, 8],
            [17, 0, 8], [18, 0, 8], [2, 0, 9], [8, 0, 9], [12, 0, 9], [2, 0, 10],
           
            [12, 0, 10], [13, 0, 10], [14, 0, 10], [15, 0, 10], [16, 0, 10], [17, 0, 10],
            [18, 0, 10], [19, 0, 10], [4, 0, 11], [14, 0, 11], [16, 0, 11], [2, 0, 12],
            [3, 0, 12], [4, 0, 12], [6, 0, 12], [7, 0, 12], [8, 0, 12], [10, 0, 12],
            [11, 0, 12], [12, 0, 12], [14, 0, 12], [16, 0, 12], [17, 0, 12], [18, 0, 12],
            [2, 0, 13], [4, 0, 13], [8, 0, 13], [12, 0, 13], [1, 0, 14], [2, 0, 14],
            [4, 0, 14], [5, 0, 14], [6, 0, 14], [7, 0, 14], [8, 0, 14], [9, 0, 14],

            // border of maze
            [0, 0, 1], [0, 0, 2], [0, 0, 3], [0,0 , 4], [0, 0, 5], [0, 0, 6],
            [0, 0, 7], [0, 0, 8], [0, 0, 9], [0,0 , 10], [0, 0, 11], [0, 0, 12], [0, 0, 13], [0, 0, 14],

            [1, 0, 14], [2, 0, 14], [3, 0, 14], [4, 0, 14], [5, 0, 14], [6, 0, 14], [7, 0, 14], 
            [8, 0, 14], [9, 0, 14], [10, 0, 14], [11, 0, 14], [12, 0, 14], [13, 0, 14], [14, 0, 14], [15, 0, 14], [16, 0, 14], [17, 0, 14], [18, 0, 14], [19, 0, 14], [20, 0, 14],
            [20, 0, 12], [20, 0, 11], [20, 0, 10], [20, 0, 9], [20, 0, 8], [20, 0, 5], [20, 0, 6], [20, 0, 7], [20, 0, 8], [20, 0, 9], [20, 0, 4], [20, 0, 3], [20, 0, 2], [20, 0, 1], [20, 0, 13]

           
            
            
            
            
            
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

    /*
    make_control_panel() {
        
        this.key_triggered_button("Rotate Left", ["l"], () => {
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

        this.key_triggered_button("Rotate Right", ["j"], () => {
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

        this.key_triggered_button("Move", ["i"], () => {
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

        this.key_triggered_button("Back", ["k"], () => {
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

        
    } */

    // draw walls at the specified position (x, y, z) in the scene
    draw_box(context, program_state, model_transform, x, y, z) {
        model_transform = Mat4.identity().times(Mat4.translation(x, y, z));
        return model_transform;
    }

    // draw the floor of the maze
    draw_floor(context, program_state) {
        const floor_transformation = Mat4.identity()
            .times(Mat4.translation(20, -1, -10))
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
        this.init_crosshair_canvas();
    }

    

    init_crosshair_canvas() {
        this.crosshair_canvas = document.getElementById('crosshair-canvas');
        this.crosshair_ctx = this.crosshair_canvas.getContext('2d');

    }


    spawn_projectile(){
        if(this.projDelay == 0){
            
            this.proj_transf = Mat4.identity().times(Mat4.translation(this.person_location[0],this.person_location[1],this.person_location[2]));
            //this.proj_transf = Mat4.identity().times(Mat4.translation(this.camPosition[0],this.camPosition[1],this.camPosition[2]));
            let dirVec = this.lookatpoint.minus(vec3(this.person_location[0],this.person_location[1],this.person_location[2]));
            const proj = new Projectile(this.proj_transf, 40, dirVec);
            this.projList.push(proj);
            this.projDelay = 20;
        }

       
        
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

    draw_crosshair() {
        const ctx = this.crosshair_ctx;
        const canvas = this.crosshair_canvas;

        let w = canvas.width;
        let h = canvas.height;
        // Clear the previous crosshair
        ctx.clearRect(0, 0, w, h);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const size = 5;  // Size of the crosshair

        ctx.save();


        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 0, 0, 1)';

        // Draw horizontal line
        ctx.beginPath();
        ctx.moveTo(centerX - size, centerY);
        ctx.lineTo(centerX + size, centerY);
        ctx.stroke();

        // Draw vertical line
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - size);
        ctx.lineTo(centerX, centerY + size);
        ctx.stroke();


        ctx.restore();

    }

    display(context, program_state, dt = program_state.animation_delta_time / 700) {

        const m = this.speed_multiplier * this.meters_per_frame,
        r = this.speed_multiplier * this.radians_per_frame;

    if (this.will_take_over_graphics_state) {
        this.reset(program_state);
        this.will_take_over_graphics_state = false;
    }

    if (!this.mouse_enabled_canvases.has(context.canvas)) {
        this.add_mouse_controls(context.canvas);
        this.mouse_enabled_canvases.add(context.canvas)
    }
    let oldMatrix = this.matrix();
    //let oldInvMatrix = this.inverse();
    // Move in first-person.  Scale the normal camera aiming speed by dt for smoothness:
    this.first_person_flyaround(dt * r, dt * m);
    // Also apply third-person "arcball" camera mode if a mouse drag is occurring:
    if (this.mouse.anchor)
        this.third_person_arcball(dt * r);

        //other stuff

        super.display(context, program_state);

        const t = program_state.animation_time;
       // console.log("t : " + t);
       // console.log("tick is " + this.tick)
        let x = 0;
      //  console.log(x);
        for (let i=0; i<100000; i++) {
            x++;
            if (x%1000 == 0) {
                //console.log(x);
            }
        }
      //  console.log(x);
        
        
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
        if(this.projList.length != 0){
            //console.log("Should be showing...");
            let anyMovement = (this.thrust[0] != 0) || (this.thrust[1] != 0) || (this.thrust[2] != 0);
            if(!this.freeze || (this.freeze && anyMovement)){
                for (let p of this.projList) {
                    p.update(dt);
                }
            }
            
            for (let p of this.projList) {
                p.render(context, program_state, this.materials.bullet, this.shapes, this.materials.gun, Mat4.translation(0.3,0,0).times(this.matrix()));
                
                
            }
            if(this.projDelay > 0){
                this.projDelay = this.projDelay - 1;
            }
            
            //this.proj.render(context, program_state, this.materials.bullet, this.shapes);
        }
        

        this.tick = this.tick + 1;
        this.draw_crosshair();
    }


    set_recipient(matrix_closure, inverse_closure) {
        // set_recipient(): The camera matrix is not actually stored here inside Movement_Controls;
        // instead, track an external target matrix to modify.  Targets must be pointer references
        // made using closures.
        this.matrix = matrix_closure;
        this.inverse = inverse_closure;
    }

    reset(graphics_state) {
        // reset(): Initially, the default target is the camera matrix that Shaders use, stored in the
        // encountered program_state object.  Targets must be pointer references made using closures.
        this.set_recipient(() => graphics_state.camera_transform,
            () => graphics_state.camera_inverse);
    }

    add_mouse_controls(canvas) {
        // add_mouse_controls():  Attach HTML mouse events to the drawing canvas.
        // First, measure mouse steering, for rotating the flyaround camera:
        
        canvas.addEventListener('click', () => {
            canvas.requestPointerLock();
        });
        const lockChangeAlert = () => {
            if (document.pointerLockElement === canvas ||
                document.mozPointerLockElement === canvas ||
                document.webkitPointerLockElement === canvas) {
                console.log('The pointer is now locked.');
                document.addEventListener('mousemove', updatePosition, false);
            } else {
                console.log('The pointer is now unlocked.');
                document.removeEventListener('mousemove', updatePosition, false);
            }
        };
    
        document.addEventListener('pointerlockchange', lockChangeAlert, false);
        document.addEventListener('mozpointerlockchange', lockChangeAlert, false);
        document.addEventListener('webkitpointerlockchange', lockChangeAlert, false);
    
        const updatePosition = (event) => {
            const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
            const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
    
            // Handle the mouse movement
            console.log('Mouse moved:', movementX, movementY);

            let sens = 0.1;
            this.lookatpoint[1] += -1 * movementY * sens;
            this.lookatpoint[2] += movementX * sens;
            this.camera_transformation.set(Mat4.look_at(this.camPosition, this.lookatpoint, this.upvector));
    
            // Example: Update the position of an object based on mouse movement
            // object.position.x += movementX;
            // object.position.y += movementY;
        };
        this.mouse = { "from_center": vec(0, 0) };
        const mouse_position = (e, rect = canvas.getBoundingClientRect()) =>
            vec(e.clientX - (rect.left + rect.right) / 2, e.clientY - (rect.bottom + rect.top) / 2);
        // Set up mouse response.  The last one stops us from reacting if the mouse leaves the canvas:
        document.addEventListener("mouseup", e => {
            this.mouse.anchor = undefined;
        });
        canvas.addEventListener("mousedown", e => {
            e.preventDefault();
            this.mouse.anchor = mouse_position(e);
        });
        canvas.addEventListener("mousemove", e => {
            e.preventDefault();
            this.mouse.from_center = mouse_position(e);
        });
        canvas.addEventListener("mouseout", e => {
            if (!this.mouse.anchor) this.mouse.from_center.scale_by(0)
        });
    }

    show_explanation(document_element) {
    }

    make_control_panel() {
        // make_control_panel(): Sets up a panel of interactive HTML elements, including
        // buttons with key bindings for affecting this scene, and live info readouts.
        this.control_panel.innerHTML += "Click and drag the scene to spin your viewpoint around it.<br>";
        this.live_string(box => box.textContent = "- Position: " + this.pos[0].toFixed(2) + ", " + this.pos[1].toFixed(2)
            + ", " + this.pos[2].toFixed(2));
        this.new_line();
        // The facing directions are surprisingly affected by the left hand rule:
        this.live_string(box => box.textContent = "- Facing: " + ((this.z_axis[0] > 0 ? "West " : "East ")
            + (this.z_axis[1] > 0 ? "Down " : "Up ") + (this.z_axis[2] > 0 ? "North" : "South")));
        this.new_line();
        this.new_line();

        this.key_triggered_button("Up", [" "], () => this.thrust[1] = -1, undefined, () => this.thrust[1] = 0);
        this.key_triggered_button("Forward", ["w"], () => this.thrust[2] = 0.1, undefined, () => this.thrust[2] = 0);
        this.new_line();
        this.key_triggered_button("Left", ["a"], () => this.thrust[0] = 0.1, undefined, () => this.thrust[0] = 0);
        this.key_triggered_button("Back", ["s"], () => this.thrust[2] = -0.1, undefined, () => this.thrust[2] = 0);
        this.key_triggered_button("Right", ["d"], () => this.thrust[0] = -0.1, undefined, () => this.thrust[0] = 0);
        this.new_line();
        this.key_triggered_button("Down", ["z"], () => this.thrust[1] = 1, undefined, () => this.thrust[1] = 0);
        this.key_triggered_button("Spawn Bullet", ["m"], () => this.spawn_projectile());
        this.key_triggered_button("Time Freeze", ["t"], () => this.freeze = !this.freeze);
        const speed_controls = this.control_panel.appendChild(document.createElement("span"));
        speed_controls.style.margin = "30px";
        this.key_triggered_button("-", ["o"], () =>
            this.speed_multiplier /= 1.2, undefined, undefined, undefined, speed_controls);
        this.live_string(box => {
            box.textContent = "Speed: " + this.speed_multiplier.toFixed(2)
        }, speed_controls);
        this.key_triggered_button("+", ["p"], () =>
            this.speed_multiplier *= 1.2, undefined, undefined, undefined, speed_controls);
        this.new_line();
        this.key_triggered_button("Roll left", [","], () => this.roll = 1, undefined, () => this.roll = 0);
        this.key_triggered_button("Roll right", ["."], () => this.roll = -1, undefined, () => this.roll = 0);
        this.new_line();
        this.key_triggered_button("(Un)freeze mouse look around", ["f"], () => this.look_around_locked ^= 1, "#8B8885");
        this.new_line();
        this.key_triggered_button("Go to world origin", ["r"], () => {
            this.matrix().set_identity(4, 4);
            this.inverse().set_identity(4, 4)
        }, "#8B8885");
        this.new_line();

        this.key_triggered_button("Look at origin from front", ["1"], () => {
            this.inverse().set(Mat4.look_at(vec3(0, 0, 10), vec3(0, 0, 0), vec3(0, 1, 0)));
            this.matrix().set(Mat4.inverse(this.inverse()));
        }, "#8B8885");
        this.new_line();
        this.key_triggered_button("from right", ["2"], () => {
            this.inverse().set(Mat4.look_at(vec3(10, 0, 0), vec3(0, 0, 0), vec3(0, 1, 0)));
            this.matrix().set(Mat4.inverse(this.inverse()));
        }, "#8B8885");
        this.key_triggered_button("from rear", ["3"], () => {
            this.inverse().set(Mat4.look_at(vec3(0, 0, -10), vec3(0, 0, 0), vec3(0, 1, 0)));
            this.matrix().set(Mat4.inverse(this.inverse()));
        }, "#8B8885");
        this.key_triggered_button("from left", ["4"], () => {
            this.inverse().set(Mat4.look_at(vec3(-10, 0, 0), vec3(0, 0, 0), vec3(0, 1, 0)));
            this.matrix().set(Mat4.inverse(this.inverse()));
        }, "#8B8885");
        this.new_line();
        this.key_triggered_button("Attach to global camera", ["Shift", "R"],
            () => {
                this.will_take_over_graphics_state = true
            }, "#8B8885");
        this.new_line();
    }

    first_person_flyaround(radians_per_frame, meters_per_frame, leeway = 0) {
        // (Internal helper function)
        // Compare mouse's location to all four corners of a dead box:
        const offsets_from_dead_box = {
            plus: [this.mouse.from_center[0] + leeway, this.mouse.from_center[1] + leeway],
            minus: [this.mouse.from_center[0] - leeway, this.mouse.from_center[1] - leeway]
        };
        //console.log("x distance is " + this.mouse.from_center[0]);
        //console.log("y distance is " + this.mouse.from_center[1]);
        // Apply a camera rotation movement, but only when the mouse is
        // past a minimum distance (leeway) from the canvas's center:
        if (!this.look_around_locked)
            
            // If steering, steer according to "mouse_from_center" vector, but don't
            // start increasing until outside a leeway window from the center.
            for (let i = 0; i < 2; i++) {                                     // The &&'s in the next line might zero the vectors out:
                let o = offsets_from_dead_box,
                    velocity = ((o.minus[i] > 0 && o.minus[i]) || (o.plus[i] < 0 && o.plus[i])) * radians_per_frame;
                // On X step, rotate around Y axis, and vice versa.

       
                //this.camPosition = vec3(2, 0.8, -2);
                //this.lookatpoint = vec3(10, 0.8, -2);
                //this.upvector = vec3(0, 1, 0);
                //this.lookatpoint[2] += 10*velocity;
                //this.camera_transformation.set(Mat4.look_at(this.camPosition, this.lookatpoint, this.upvector));
         

                //this.matrix().post_multiply(Mat4.rotation(-velocity, i, 1 - i, 0));
                //this.inverse().pre_multiply(Mat4.rotation(+velocity, i, 1 - i, 0));
            }
        this.matrix().post_multiply(Mat4.rotation(-.1 * this.roll, 0, 0, 1));
        this.inverse().pre_multiply(Mat4.rotation(+.1 * this.roll, 0, 0, 1));
        // Now apply translation movement of the camera, in the newest local coordinate frame.
      //  this.matrix().post_multiply(Mat4.translation(...this.thrust.times(-meters_per_frame)));
      //  this.inverse().pre_multiply(Mat4.translation(...this.thrust.times(+meters_per_frame)));
        let f = this.camPosition[0];
        let s = this.camPosition[2];
        let t = this.lookatpoint[0];
        let fw = this.lookatpoint[2];
              
        this.camPosition[0] += this.thrust[2];
        this.camPosition[2] += -1 * this.thrust[0];
        this.lookatpoint[0] += this.thrust[2];
        this.lookatpoint[2] += -1 * this.thrust[0];
        this.camera_transformation.set(Mat4.look_at(this.camPosition, this.lookatpoint, this.upvector));

        this.pos = this.inverse().times(vec4(0, 0, 0, 1));
        this.z_axis = this.inverse().times(vec4(0, 0, 1, 0));

        let new_player_loc = vec4(this.camPosition[0],this.camPosition[1],this.camPosition[2], 1);
        
        //console.log("current position is " + this.);
       // console.log("current player position is " + this.person_location);


        const new_person_location_tips = this.get_person_box_tips(new_player_loc);

        let ok = true;
        ok = ok && this.check_person_colliding_wall(new_person_location_tips);
        if(!ok){
            //this.matrix().post_multiply(Mat4.translation(...this.thrust.times(+meters_per_frame)));
            //this.inverse().pre_multiply(Mat4.translation(...this.thrust.times(-meters_per_frame)));
            this.camPosition[0] = f;
            this.camPosition[2] = s;
            this.lookatpoint[0] = t;
            this.lookatpoint[2] = fw;
            this.camera_transformation.set(Mat4.look_at(this.camPosition, this.lookatpoint, this.upvector));

        //this.matrix().set(oldMatrix);
        // this.inverse().set(oldInvMatrix);
        // this.pos = oldPos;
        // this.z_axis = oldZ;
        }
        this.person_location = new_player_loc;
    }

    third_person_arcball(radians_per_frame) {
        // (Internal helper function)
        // Spin the scene around a point on an axis determined by user mouse drag:
        const dragging_vector = this.mouse.from_center.minus(this.mouse.anchor);
        if (dragging_vector.norm() <= 0)
            return;
        this.matrix().post_multiply(Mat4.translation(0, 0, -25));
        this.inverse().pre_multiply(Mat4.translation(0, 0, +25));

        const rotation = Mat4.rotation(radians_per_frame * dragging_vector.norm(),
            dragging_vector[1], dragging_vector[0], 0);
        this.matrix().post_multiply(rotation);
        this.inverse().pre_multiply(rotation);

        this.matrix().post_multiply(Mat4.translation(0, 0, +25));
        this.inverse().pre_multiply(Mat4.translation(0, 0, -25));
    }
}