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
    Vector, Vector3, vec, Vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture,
} = tiny; // extract several classes, functions, and constants from the tiny module

const MOVE = 1;
const SHUFFLE = 2;
const ATTACK = 3;
const CHARGE = 4;
const BOMB = 5;

const {
    Cube,
    Cube_Normal,
    Square_Normal,
    Square,
    Subdivision_Sphere,
    Rounded_Capped_Cylinder,
    Capped_Cylinder,
    Textured_Phong,
    Fake_Bump_Map,
    Phong_Shader,
    Tetrahedron,
    Cone_Tip,
    Textured_Phong_Normal_Map,
    Funny_Shader,
    Cylindrical_Tube,
} = defs; // extracts specific shapes and shaders from the defs module

const original_box_size = 2;


class Enemy {
    normalizeVector(vector) {
        // Calculate the magnitude (length) of the vector
        const length = Math.sqrt(vector.reduce((sum, component) => sum + component ** 2, 0));
        
        // Check if the length is zero to avoid division by zero
        if (length === 0) {
            throw new Error("Cannot normalize a zero-length vector");
        }
    
        // Divide each component by the length to normalize
        return vector.map(component => component / length);
    }

    handleCollision(min, max) {
        const minAngle = min;  // Minimum angle in degrees
        const maxAngle = max; // Maximum angle in degrees

        // Convert angle to radians
        const minAngleRad = minAngle * (Math.PI / 180);
        const maxAngleRad = maxAngle * (Math.PI / 180);

        // Generate a random angle within the range
        const randomAngleRad = Math.random() * (maxAngleRad - minAngleRad) + minAngleRad;

        // Determine if we should rotate clockwise or counterclockwise
        const clockwise = Math.random() >= 0.5 ? 1 : -1;

        // Calculate the new direction
        const cosAngle = Math.cos(randomAngleRad);
        const sinAngle = Math.sin(randomAngleRad) * clockwise;

        const newDirection = vec3(
            this.direction[0] * cosAngle - this.direction[2] * sinAngle,
            this.direction[1],
            this.direction[0] * sinAngle + this.direction[2] * cosAngle,
             // Assuming no change in the z-component for simplicity
        );

        // Normalize the new direction
        this.direction = this.normalizeVector(newDirection);
    }

    distanceBetweenPoints(point1, point2) {
        // Ensure both points have three coordinates
        if (point1.length !== 3 || point2.length !== 3) {
            throw new Error("Both points must have three coordinates.");
        }
    
        const dx = point2[0] - point1[0];
        const dy = point2[1] - point1[1];
        const dz = point2[2] - point1[2];
    
        // Calculate the distance using the Euclidean distance formula
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
        return distance;
    }
    
    
    constructor(position) {
        this.initial = 0;
        this.position = position;
        this.model_transform = Mat4.identity();
        this.moving = false; // Whether moving or at standstill
        this.direction = vec3(1, 0, 0);
        this.timer = 0;
        this.reverseTimer = 0;
        this.moveStatus = SHUFFLE;
        this.detectRange = 1; // change back to 30
        this.outRange = 20;
        this.speed = 0.02;
        this.shootTimer = 80;
        this.health = 5;
        this.damageTimer = 0;
        this.cooldownTimer = 0;
       // this.canFlash = canFlash;
    }

    update(dt, playerLoc, collide, flash) {

        
        if(collide){
            this.handleCollision(150, 200);
            if(this.speed == 0.02){
                this.reverseTimer = 28;
            }
            else{
                this.reverseTimer = 15;
            }
           
        }

        if (this.timer <= 0 && this.reverseTimer <= 0) {
            
            if(this.moveStatus == SHUFFLE){
                //choose a random direction
                this.handleCollision(0,360);
                this.timer = 200;
            }
            else if(this.moveStatus != SHUFFLE){
                let r = Math.random();
                if(flash){
                    this.moveStatus = BOMB;
                    this.timer = 200;
                }
                else if(r < 0){
                    this.moveStatus = BOMB;
                    this.timer = 100;
                    
                }
                else if(r < 0.4){
                    this.moveStatus = ATTACK;
                    this.timer = 95;
                }
                else if(r < 0.75){
                    this.moveStatus = CHARGE;
                    this.timer = 40;
                    this.speed = 0.16;
                }
                else{
                    this.moveStatus = MOVE;
                    this.timer = 100;
                    this.speed = 0.04;
                }
                
     
            }

        }

        //now check if ACTIVE
        if(this.moveStatus == SHUFFLE && this.distanceBetweenPoints(this.position, vec3(playerLoc[0],playerLoc[1],playerLoc[2])) < this.detectRange){
           
            this.moveStatus = MOVE;
            this.speed = 0.04;
        }

        if(this.moveStatus == SHUFFLE && this.health < 5){
            this.moveStatus = MOVE;
            this.speed = 0.04;
        }
        else if(this.moveStatus == MOVE && this.distanceBetweenPoints(this.position, vec3(playerLoc[0],playerLoc[1],playerLoc[2])) > this.outRange){
            
            this.moveStatus = SHUFFLE;
            this.speed = 0.02
        }


        // Update direction to point towards the playe
        if((this.moveStatus == MOVE || this.moveStatus == CHARGE) && this.reverseTimer == 0){
         
            this.direction = vec3(
                playerLoc[0] - this.position[0], 
                0,
                playerLoc[2] - this.position[2]
            );
        }

        //Handle attack

        
        let normDirection = this.normalizeVector(this.direction);

        // Update position based on normalized direction and speed
        if (this.moveStatus != ATTACK) {
           

            this.position = vec3(
                this.position[0] + normDirection[0] * this.speed * 0.5,
                this.position[1] + normDirection[1] * this.speed  * 0.5,
                this.position[2] + normDirection[2] * this.speed  * 0.5
            );
        }

        // Decrement the timer
        this.timer -= 1;
        if(this.reverseTimer > 0){
            this.reverseTimer -= 1;
        }
        if(this.shootTimer > 0){
            this.shootTimer -= 1;
        }
        if(this.damageTimer > 0){
            this.damageTimer -= 1;
        }
        if(this.cooldownTimer > 0){
            this.cooldownTimer -= 1;
        }
       
    }


    draw_bot(context, program_state, shapes, material2, material, time){
      

        let angle = 2*Math.PI/24 * Math.sin(time/300);
        let angleArm = 24/10 * angle;
        if(this.moveStatus == ATTACK){
            angle = 0;
            angleArm = 0;
        }
        if(this.damageTimer > 0){
            material = material2;
        }
        let model_transform = this.model_transform;
        let spawn_position = this.position; // position of the goal chest in the game
        model_transform = model_transform.times(Mat4.translation(...spawn_position)); // transformation for the treasure

        if (this.direction[0] === 0 && this.direction[2] === 0) {
            return 0; // Handle zero vector case (any angle is valid)
          }
        
          // Calculate the angle using arctangent (atan2 for quadrant handling)
          let rot = Math.atan2(this.direction[0], this.direction[2]);
        
          // Convert from radians to degrees (optional)
        
        model_transform = model_transform.times(Mat4.rotation(rot, 0, 1, 0));
        // Draw head
        let head_transform = model_transform.times(Mat4.rotation(-angleArm/6,0,1,0))
                                            .times(Mat4.translation(0, 1.2, 0))
                                             .times(Mat4.scale(0.4, 0.4, 0.4));
        shapes.sphere.draw(context, program_state, head_transform, material);

        // Draw body
        let body_transform = model_transform.times(Mat4.rotation(-angleArm/6,0,1,0))
                                            .times(Mat4.translation(0, 0, 0))
                                            .times(Mat4.scale(0.45, 0.8, 0.55));
        shapes.body.draw(context, program_state, body_transform, material);

        // Draw left arm
        let leftAngle = angleArm;
        let rightAngle = -angleArm;
        if(this.moveStatus == ATTACK){
            leftAngle = -Math.PI/2.9;
        }
        if(this.moveStatus == CHARGE){
            leftAngle = -Math.PI/2.9;
            rightAngle = -Math.PI/2.9;
        }
        let left_arm_transform = model_transform.times(Mat4.translation(0,0.6,0))
                                                .times(Mat4.rotation(leftAngle,1,0,0))
                                                .times(Mat4.translation(0,-0.6,0))
                                                .times(Mat4.translation(-0.5, 0, 0.15))
                                                .times(Mat4.scale(0.1, 0.6, 0.1));
                                                
        shapes.cylinder.draw(context, program_state, left_arm_transform, material);

        // Draw right arm
        let right_arm_transform = model_transform.times(Mat4.translation(0,0.6,0))
                                                .times(Mat4.rotation(rightAngle,1,0,0))
                                                .times(Mat4.translation(0,-0.6,0))
                                                .times(Mat4.translation(0.5, 0, 0.15))
                                                 .times(Mat4.scale(0.1, 0.6, 0.1));
        shapes.cylinder.draw(context, program_state, right_arm_transform, material);

        // Draw left leg
        let left_leg_transform = model_transform.times(Mat4.rotation(angle,1,0,0))
                                                .times(Mat4.translation(-0.24, -1.5, 0))
                                                .times(Mat4.scale(0.14, 1, 0.2));
        shapes.cylinder.draw(context, program_state, left_leg_transform, material);

        // Draw right leg
        let right_leg_transform = model_transform.times(Mat4.rotation(-1*angle,1,0,0))
                                                .times(Mat4.translation(0.24, -1.5, 0))
                                                 .times(Mat4.scale(0.14, 1, 0.2));
        shapes.cylinder.draw(context, program_state, right_leg_transform, material);
    }
}

class Projectile {

    constructor(currMatrix, speed, dir, evil, pos) {
        this.initial = currMatrix;
        this.model_transform = currMatrix.times(Mat4.scale(.1, .1, .1));;
      //  this.direction = currMatrix.times(vec4(1, 0, 0, 0)).to3();
        this.direction = dir;
        this.speed = speed;
        this.start = 30;
        this.timer = this.start;
        this.evil = evil;
        this.position = pos;
        this.lifeTime = 10;
        this.isAlive = true;
    }

    getTranslation(matrix) {
        return vec3(matrix[0][3], matrix[1][3], matrix[2][3]);

    }

    update(dt) {
        if(this.lifeTime <= 0){
            this.isAlive = false;
            return;
        }
        this.lifeTime -= dt;
       // console.log("hi");
        // Update position based on direction and speed
        this.model_transform = this.model_transform.times(Mat4.translation(...this.direction.times(this.speed*dt)));
        //this.position = this.getTranslation(this.model_transform);
       // console.log(this.position);
       
    }

    render(context, program_state, material, shapes, gunMaterial, currMat, materialEvil) {
        // Render the projectile using the capped cylinder shape
        if(this.timer > 0 && !this.evil){
            this.draw_gun(context, program_state, shapes, gunMaterial, currMat);
            this.timer = this.timer - 1;
        }
        if(!this.evil){
            shapes.bullet.draw(context, program_state, this.model_transform, material);
        }
        else{
            shapes.bullet.draw(context, program_state, this.model_transform, materialEvil);
        }
       
        
    }

    draw_gun(context, program_state, shapes, gunMaterial, currMat){
        let downTr = 0;
        if(this.timer <= (this.start/2)){
            downTr = 0.28 - this.timer/(this.start / 0.56);
        }
        let gun_transform = Mat4.translation(-0.04,-0.06 - downTr,0.1).times(currMat
            .times(Mat4.rotation(-Math.PI/3.2, 1,0,0).  
        times(Mat4.rotation(-Math.PI/1.8, 0,1,0)).
        times(Mat4.rotation(Math.PI/9, 1,0,0)).
        times(Mat4.scale(0.04, 0.1, 0.03))));
        shapes.cube.draw(context, program_state, gun_transform, gunMaterial);


        let gun_transform2 = Mat4.translation(-0.125,-0.18 - downTr,0.13).times(currMat.
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
            'rectangle': new Cylindrical_Tube(40, 80),
            'cylinder': new Cube(),
            'body': new Capped_Cylinder(10, 10),
            'torch': new Cube(),
            'fire': new Subdivision_Sphere(3),
            'ornaments': new Cube(),
            'varied_orn': new Cube(),



        };

       

        // *** Materials
        // define the materials to be used for different objects. Each material is created with specific shader properties and textures
        this.materials = {
            plastic: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
            wall: new Material(new Textured_Phong_Normal_Map(),
                {
                    ambient: 0.2, diffusivity: 0.3, specularity: 0.3, color: hex_color("#FFFFFF"),
                    texture: new Texture("./assets/wall2.jpg"),
                    normal: new Texture("./assets/wall3.jpg")
                }),
            floor: new Material(new Shadow_Textured_Phong_Shader(1),
                {
                    ambient: 0.3, diffusivity: 0.2, specularity: 0.4,
                    color: hex_color("#aaaaaa"),
                    color_texture: new Texture("./assets/wall2.jpg"),
                    light_depth_texture: null
                }),
            environment: new Material(new Shadow_Textured_Phong_Shader(1),
                {
                    ambient: 1, diffusivity: 0, specularity: 1,
                    //color: hex_color("#FFFFFF"),
                    color_texture: new Texture("./assets/interstellar.jpg"),
                    light_depth_texture: null
                }),
            person: new Material(new Textured_Phong(),
                {
                    ambient: 1, diffusivity: 0, specularity: 0, 
                    texture: new Texture("./assets/blue.jpg"),
                }),
            light_src: new Material(new Phong_Shader(), {
                color: color(1, 1, 1, 1), ambient: 1, diffusivity: 0, specularity: 0
            }),
            pure: new Material(new Color_Phong_Shader(), {}),
            depth_tex: new Material(new Depth_Texture_Shader_2D(), {
                color: color(0, 0, .0, 1),
                ambient: 1, diffusivity: 0, specularity: 0, texture: null
            }),
            chest: new Material(new Textured_Phong(), {
                ambient: 1, diffusivity: 0, specularity: 0,
                texture: new Texture("./assets/chest.jpg")
            }),
            bullet: new Material(new Textured_Phong(),{
                texture: new Texture("./assets/weapon.jpg")
            }),
            bulletEvil:new Material(new Phong_Shader,
                {
                    ambient: 1, diffusivity: 0.5, color: hex_color("#FF0000")
                }),
            gun: new Material(new Textured_Phong(),{
                ambient: 1, diffusivity: 0.8, specularity: 0,
                texture: new Texture("./assets/weapon.jpg"),
            }),
            robFace: new Material(new Textured_Phong(),{
                ambient: 1, diffusivity: 0.8, specularity: 0,
                texture: new Texture("./assets/univ1.jpg", "NEAREST"),
            }),
            bug: new Material(new Textured_Phong(), {
                ambient: 1,
                diffusivity: 0.5,
                specularity: 0,
                texture: new Texture("./assets/fire2.jpg")
            }),
            bug2: new Material(new Textured_Phong(), {
                ambient: 1,
                diffusivity: 0.5,
                specularity: 0,
                texture: new Texture("./assets/fire3.jpg")
            }),
            bug35: new Material(new Textured_Phong(), {
                ambient: 1,
                diffusivity: 0.5,
                specularity: 0,
                texture: new Texture("./assets/fire35.jpg")
            }),
            bug3: new Material(new Textured_Phong(), {
                ambient: 1,
                diffusivity: 0.5,
                specularity: 0,
                texture: new Texture("./assets/fire4.jpg")
            }),
            bug4: new Material(new Textured_Phong(), {
                ambient: 1,
                diffusivity: 0.5,
                specularity: 0,
                texture: new Texture("./assets/fire5.jpg")
            }),

            univ: new Material(new Textured_Phong(),{
                color: hex_color("000000"),
                ambient: 1, specularity: 0,
                texture: new Texture("./assets/stars.png", "NEAREST"),
            }),
            red: new Material(new Phong_Shader,{
                color: color(1,0,0,1),
                ambient: 0.5,
                diffusivity: 0.5,
                specularity: 0.5
            }),
            fire: new Material(new Funny_Shader(), {}),
            wood: new Material(new Textured_Phong(),
                {
                    ambient: 0.5, diffusivity: 1.0, specularity: 0.3,
                }),

            ornaments: new Material(new Textured_Phong(), {
                ambient: 1, diffusivity: 0, specularity: 0.5,
                texture: new Texture("./assets/ghost.jpg")
            }),
            varied_orn: new Material(new Textured_Phong(), {
                ambient: 1, diffusivity: 0, specularity: 0.5,
                texture: new Texture("./assets/fire_img.jpg")
            })

        





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
        this.dead = false;
        this.canDie = true;
        this.lavaBlocks = [
          
            
            [20.5,-6],
            [12,-12],
            [10.6,-12],
            [6.8,-22],
            [12,-19],
            [12,-21],
            [10.6,-21],
            [10.6,-19],
            [12,-2],
            [10.6,-2],
            [5.2,-7],
            [6.6,-7],
            [34,-2],
            [34,-6],
            [34,-26],
            [24,-14],
            [30,-14],
            [28,-9.5],
   
            [20,-20],
            [21.4,-20],
            [1.15,-19],
            [2.2,-19],
            [38,-16],
          ];
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

        this.has_won = false;

        this.map_plane = res // stores projected 2d coords of maze walls
        this.proj = null;
        this.projList = [];
        this.enemyList = [];
        this.freeze = false;
        this.whiteout_shader = new Whiteout_Shader();
        this.prevTime = 0;
        this.whiteout_material = {
            shader: this.whiteout_shader
        }
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

        this.jumpBool = false;
        // Initialization
        this.smokeList = []
        this.grenadeList = []
        this.enemyKill = vec3(15,1,1);
        this.enemyParticleSystem;
        this.flashGrenadeTimer = 0;
        this.needsFlash = false;
        this.player_transform_exists = false;
        this.player_transform;
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

    get_enemy_box_tips(hypothetic_enemy_position) {
        const enemy_location = hypothetic_enemy_position ? hypothetic_enemy_position : hypothetic_enemy_position; // Uses the hypothetical position
        const base = 0.3; // defines half the size of the person's bounding box
        const offsets = this.get_offsets(base); // uses the offsets to determine the corners of the bounding box
        let res = []; // add offsets to the person's location to compute the bounding box tips
        for (let offset of offsets) {
            res.push(
                vec(enemy_location[0] + offset[0], -enemy_location[2] - offset[1])
            )
        }
        return res
    }

    get_bullet_box_tips(hypothetic_bullet_position) {
        const bullet_location = hypothetic_bullet_position;
        const base = 0.1; // defines half the size of the person's bounding box
        const offsets = this.get_offsets(base); // uses the offsets to determine the corners of the bounding box
        let res = []; // add offsets to the person's location to compute the bounding box tips
        for (let offset of offsets) {
            res.push(
                vec(bullet_location[0] + offset[0], -bullet_location[2] - offset[1])
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
        if (this.has_won) {
            return false; // If the game is already won, skip the check
        }

        if (this.box_collide_2d(
            new_person_location_tips,
            this.get_wall_brick_box_tips(this.goal_position) // use box_collide_2d method to check if the player's new position collides with the goal position
        )) {
            this.has_won = true;
            if (confirm("You won! Click 'OK' to restart.")) {
                location.reload();
            }
            return false;
        }
        return true
    }

    check_bullet_collision(bullet, person){ //for both enemies, people
        let bullet_loc = bullet.getTranslation(bullet.model_transform);

        let person_loc;
        let boxPos;
        if(person instanceof Enemy){
           // console.log("Yep");
            person_loc = person.position;
           
        }
        else{
            person_loc = vec3(this.person_location[0],this.person_location[1],this.person_location[2]);

        }

       

        //
        let dist = Math.pow(person_loc[0]-bullet_loc[0],2)
        +  Math.pow(person_loc[2]-bullet_loc[2],2);

        let ycheck = Math.pow(person_loc[1] - bullet_loc[1],2);
        return (dist < 0.7) && (ycheck < 3.4);




        


    }  

    check_bad_bullet_collision(bullet, person){ //for both enemies, people
        let bullet_loc = bullet.getTranslation(bullet.model_transform);

        let person_loc;
        let boxPos;

        person_loc = vec3(this.person_location[0],this.person_location[1],this.person_location[2]);

        let dist = Math.pow(person_loc[0]-bullet_loc[0],2)
        +  Math.pow(person_loc[2]-bullet_loc[2],2);

        let ycheck = Math.pow(person_loc[1] - bullet_loc[1],2);
        return (dist < 0.3)




        


    }  

    // check if the player's new position collides with any wall in the maze
    check_person_colliding_wall(new_person_location_tips) { // take in the projected 2D coordinates of the player's new position
        //console.log("hhhh");
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



    // draw walls at the specified position (x, y, z) in the scene
    draw_box(context, program_state, model_transform, x, y, z) {
        model_transform = Mat4.identity().times(Mat4.translation(x, y, z));
        return model_transform;
    }



    // draw the floor of the maze
    draw_floor(context, program_state, shadow_pass) {
        
        const floor_transformation = Mat4.identity()
            .times(Mat4.translation(20, -1, -10))
            .times(Mat4.scale(20, 0.2, 20));
        const sphere_transformation = Mat4.identity().times(Mat4.translation(17,0,-10)).times(Mat4.scale(1000,1000,1000));
       this.shapes.cube.draw(context, program_state, floor_transformation, shadow_pass ? this.materials.floor : this.materials.pure);
        this.shapes.sphere.draw(context, program_state, sphere_transformation, this.materials.environment);
        
        
    
    }

    // draw the player character in the maze
    draw_person(context, program_state) {
        program_state.set_camera(this.camera_transformation) // sets the camera transformation to the current camera transformation
        if(this.player_transform_exists){
            const here = Mat4.identity().times(Mat4.translation(this.player_transform[0], -1, this.player_transform[2])).times(Mat4.scale(0.5,0.5,0.5));
            this.shapes.person.draw(context, program_state, here, this.materials.person); // draw the player character shape using its transformation (person_transformation) and material
        }

    }

    // Define draw_ornaments function
    draw_ornaments(context, program_state, x, y, z) {
        // Assuming the ornament shape and material are properly defined and accessible
        let ornament_transformation = Mat4.identity()
            .times(Mat4.translation(x, y, z))
            .times(Mat4.scale(0.2, 0.2, 0.2)); // Increase scale for larger cube

        // Draw ornament
        this.shapes.ornaments.draw(
            context, program_state,
            ornament_transformation,
            this.materials.ornaments);
    }

    draw_varied_orn(context, program_state, x, y, z) {
        let varied_orn_transformation = Mat4.identity()
            .times(Mat4.translation(x, y, z))
            .times(Mat4.scale(0.2, 0.2, 0.2)); // Increase scale for larger cube

        // Draw ornament
        this.shapes.varied_orn.draw(
            context, program_state,
            varied_orn_transformation,
            this.materials.varied_orn);
    }



    draw_torch(context, program_state, x, y, z) {
        if (x === 0 || x >= 20 || z === 0 || z >= 14) {
            return;
        }
        let torch_transformation = Mat4.identity()
            .times(Mat4.translation(x, y, z))
            .times(Mat4.scale(0.1, 0.3, .08));
        this.shapes.torch.draw(
            context, program_state,
            torch_transformation,
            this.materials.wood);
        this.shapes.fire.draw(
            context, program_state,
            Mat4.identity()
                .times(Mat4.translation(0.05+x, y + 0.5, z))
                .times(Mat4.scale(0.25, 0.25, 0.25)),
            this.materials.fire
        );
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
        const scale_factor = 1; // Adjust this factor to change the height
        for (let i = 0; i < this.box_coord.length; i++) {
            const x = original_box_size * this.box_coord[i][0];
            const y = original_box_size * this.box_coord[i][1];
            const z = -original_box_size * this.box_coord[i][2];
            
            // Apply the scaling transformation
            box_model_transform = this.draw_box(context, program_state, box_model_transform, x, y, z)
                .times(Mat4.scale(1, scale_factor, 1)); // Scale only the y dimension
            
            this.shapes.cube.draw(context, program_state, box_model_transform, shadow_pass ? this.materials.wall2 : this.materials.pure);
        }
        for (let i = 0; i < this.box_coord.length; i++) {
            const x = original_box_size * this.box_coord[i][0];
            const y = original_box_size * this.box_coord[i][1];
            const z = -original_box_size * this.box_coord[i][2];
            
            // Apply the scaling transformation
            box_model_transform = this.draw_box(context, program_state, box_model_transform, x, y, z)
                .times(Mat4.translation(0, 2, 0)); // Scale only the y dimension
            
            this.shapes.cube.draw(context, program_state, box_model_transform, shadow_pass ? this.materials.wall2 : this.materials.pure);
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
            const proj = new Projectile(this.proj_transf, 8, dirVec, false, this.person_location);
            this.projList.push(proj);
            this.projDelay = 20;
        }

       
        
    }

    normalizeVector(vector) {
        // Calculate the magnitude (length) of the vector
        const length = Math.sqrt(vector.reduce((sum, component) => sum + component ** 2, 0));
        
        // Check if the length is zero to avoid division by zero
        if (length === 0) {
            throw new Error("Cannot normalize a zero-length vector");
        }
    
        // Divide each component by the length to normalize
        return vector.map(component => component / length);
    }

    shift(vec, min, max) {
        const scale = Math.sqrt(vec.reduce((sum, component) => sum + component ** 2, 0));

        const minAngle = min;  
        const maxAngle = max; 

       
        const minAngleRad = minAngle * (Math.PI / 180);
        const maxAngleRad = maxAngle * (Math.PI / 180);

       
        const randomAngleRad = Math.random() * (maxAngleRad - minAngleRad) + minAngleRad;

      
        const clockwise = Math.random() >= 0.5 ? 1 : -1;

        // Calculate the new direction
        const cosAngle = Math.cos(randomAngleRad);
        const sinAngle = Math.sin(randomAngleRad) * clockwise;

        let newDirection = vec3(
            vec[0] * cosAngle - vec[2] * sinAngle,
            vec[1],
            vec[0] * sinAngle + vec[2] * cosAngle,
             // Assuming no change in the z-component for simplicity
        );
        newDirection = this.normalizeVector(newDirection);
        return vec3(newDirection[0]*scale, newDirection[1]*scale,newDirection[2]*scale);
       
    }

    spawn_enemy_projectile(e){

        this.proj_transf = Mat4.identity().times(Mat4.translation(e.position[0],e.position[1],e.position[2]));
        let playerLoc = this.person_location;
        let dir = vec3(
            playerLoc[0] - e.position[0], 
            0,
            playerLoc[2] - e.position[2]
        );

        let dirVec = this.shift(dir,-5,5);

        const proj = new Projectile(this.proj_transf, 8, dirVec, true, e.position);
        this.projList.push(proj);
          
        

       
        
    }

    draw_lava(context, program_state){
        
        for(const [x,z] of this.lavaBlocks){
            let lava_transform = Mat4.identity()
            .times(Mat4.translation(x, -1.3, z))
            .times(Mat4.scale(0.7,0.6,1));
            this.shapes.cube.draw(context, program_state, lava_transform, this.materials.lava);
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

    funDead(){
        if(!this.canDie){
            return;
        }
        if(!this.dead){
            this.dead = true;
            if (confirm("You died. Click 'OK' to restart.")) {
                location.reload();
            }
            else{
                location.reload();
            }
        }
        

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
    this.first_person_flyaround(dt * r, dt * m, program_state);
    // Also apply third-person "arcball" camera mode if a mouse drag is occurring:
    if (this.mouse.anchor)
        this.third_person_arcball(dt * r);

        //other stuff

        super.display(context, program_state);

        const t = program_state.animation_time;
       
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
        program_state.projection_transform = Mat4.perspective(Math.PI / 2.5, context.width / context.height, 0.01, 10000);
        this.render_scene(context, program_state, true, true, true);

        const scale_factor = 2; // Adjust this factor to change the height
        let model_transform = Mat4.identity();
        for (let i = 0; i < this.box_coord.length; i++) {
            const x = original_box_size * this.box_coord[i][0];
            const y = original_box_size * this.box_coord[i][1];
            const z = -original_box_size * this.box_coord[i][2];

            // Apply the scaling transformation
            model_transform = this.draw_box(context, program_state, model_transform, x, y, z)
                .times(Mat4.scale(1, scale_factor, 1)); 
            if (i % 2 === 0) this.draw_torch(context, program_state, x + 1.0, y + 0.3, z);
        }

        for (let i = 0; i < 40; i++) {
            if (i%2 == 0){
                this.draw_ornaments(context, program_state, i, 1, -0.9);
            } else {
                this.draw_varied_orn(context, program_state, i, 1, -0.9);
            }
        }

        for (let j = 0; j < 40; j++) {
            if (j%2 == 0) {
                this.draw_varied_orn(context, program_state, 0.9, 1, -3 - j);
            }
            else {
                this.draw_ornaments(context, program_state, 0.9, 1, -3 - j);
            }
            
        }
        


        this.draw_person(context, program_state);
        this.draw_chest(context, program_state);
        this.draw_lava(context, program_state);

        if(t == 0){
            let e1 = new Enemy(vec3(2+15,1,-2));
            this.enemyList.push(e1);
            let e2 = new Enemy(vec3(11.1,0.8,-13.4));
            this.enemyList.push(e2);
            let e4 = new Enemy(vec3(12.1,0.8,-12.4));
            this.enemyList.push(e4);
            let e3 = new Enemy(vec3(12.1,0.8,-19.4));
            this.enemyList.push(e3);

            let e5 = new Enemy(vec3(22,0.8,-13.4));
            this.enemyList.push(e5);
            let e6 = new Enemy(vec3(20,0.8,-19.4));
            this.enemyList.push(e6);
        }

        for(let e of this.enemyList){
           // console.log(this.person_location);
            let noCollide = true;
            let enemyPos = this.get_enemy_box_tips(e.position);
            if(this.check_person_colliding_wall(enemyPos)){
                //console.log("oh no");
                noCollide = false;
            }
            if(e.moveStatus == ATTACK){
                let r = Math.random();
                if(r < 1 && e.shootTimer == 0){
                    e.shootTimer = 80;
                    this.spawn_enemy_projectile(e);
                }
            }
            else if(e.moveStatus==BOMB){
                if(e.shootTimer == 0){
                    e.shootTimer = 100;
                    this.grenadeList.push(new Grenade(e.position, this.camPosition, this.smokeList, this.make_grenade_bomb, true, 5, this.flashGrenadeTimer));
                }
               
            }
            let anyMovement = (this.thrust[0] != 0) || (this.thrust[1] != 0) || (this.thrust[2] != 0);
            if(!this.freeze || (this.freeze && anyMovement)){
          
            e.update(dt, this.person_location, noCollide, this.needsFlash);
            this.prevTime = program_state.animation_time;
            }
            let colorVec = [this.materials.bug, this.materials.bug2, this.materials.bug3, this.materials.bug35, this.materials.bug4];
            let ind = 5-e.health;
            if(ind < 0 || ind > 4){
                ind = 4;
            }

            let timeInput = program_state.animation_time;
            if(this.freeze){
                timeInput = this.prevTime;
            }
            else{
                this.prevTime = timeInput;
            }

            e.draw_bot(context, program_state, this.shapes, this.materials.red, colorVec[ind], timeInput);

        }



        for(let e of this.enemyList){
            this.projList = this.projList.filter(p => p.isAlive);
            for(let p of this.projList){
                if(!p.evil && this.check_bullet_collision(p, e) && e.cooldownTimer == 0){
                    
                   // this.flashGrenadeTimer = 160;
                    

        
                    e.health -= 1;
                    e.damageTimer = 5;
                    e.cooldownTimer = 20;
                    if(e.health == 0){
                        this.enemyKill = vec3(e.position[0],e.position[1]-1.5,e.position[2]);
                        this.enemyParticleSystem = new ParticleSystem(this.enemyKill, 2);
                    }
                }

            }
        }
        for(let p of this.projList){
            if(p.evil && this.check_bad_bullet_collision(p,1)){
               
                this.funDead();
                
            }
        }

        for(let p of this.projList){
            let bullet_loc = p.getTranslation(p.model_transform);
            let bulletPos = this.get_bullet_box_tips(bullet_loc);
            if(!this.check_person_colliding_wall(bulletPos)){
                p.isAlive = false;
                this.projDelay = 0;
            }
        }

        


        this.enemyList = this.enemyList.filter(enemy => enemy.health > 0);
        

        //collision between human and enemy
        for(let e of this.enemyList){
            let enemyPos = this.get_enemy_box_tips(e.position);
            let personPos = this.get_person_box_tips(this.person_location);
            if(this.box_collide_2d(personPos, enemyPos)){
              
               this.funDead();
            }
        }

        //collision between human and lava
        for(const [x,z] of this.lavaBlocks){
            let personPos = this.camPosition;
            
            let dist = (personPos[0]-x)**2 + (personPos[2]-z)**2;
            if(dist < 1 && personPos[1] <= 0.83){
                this.funDead();
            }
        }
        



        if(this.projList.length != 0){
            //console.log("Should be showing...");
            let anyMovement = (this.thrust[0] != 0) || (this.thrust[1] != 0) || (this.thrust[2] != 0);
            if(!this.freeze || (this.freeze && anyMovement)){
                for (let p of this.projList) {
                    p.update(dt);
                }
            }
            
            for (let p of this.projList) {
                let temp = Mat4.translation(0.3,0,0).times(this.matrix());
               // temp = program_state.camera_inverse;
                p.render(context, program_state, this.materials.bullet, this.shapes, this.materials.gun, temp, this.materials.bulletEvil);
                
                
            }
            if(this.projDelay > 0){
                this.projDelay = this.projDelay - 1;
            }
            
            //this.proj.render(context, program_state, this.materials.bullet, this.shapes);
        }

        // Update the particle system

        for (let i = this.smokeList.length - 1; i >= 0; i--) {
            if (this.smokeList[i].nothingLeft) {
                this.smokeList.splice(i, 1);
            }
        }
        
        this.smokeList.forEach(smoke =>{
            let anyMovement = (this.thrust[0] != 0) || (this.thrust[1] != 0) || (this.thrust[2] != 0);
            if(!this.freeze || (this.freeze && anyMovement)){
            smoke.update(program_state.animation_delta_time / 1000)
            }
            smoke.render(context, program_state, this.shapes, this.materials.light_src);
        })

        // Render the particle system
        let playerVector = this.lookatpoint.minus(this.camPosition).normalized();
        let newTimer = 0;
        this.grenadeList = this.grenadeList = this.grenadeList.filter(nade => nade.exploded == false);
        this.grenadeList.forEach(grenade => {
            let grenadepos = this.get_bullet_box_tips(grenade.position);
            if(!this.check_person_colliding_wall(grenadepos)){
                newTimer = grenade.explode(playerVector, this.camPosition);
            }
            let anyMovement = (this.thrust[0] != 0) || (this.thrust[1] != 0) || (this.thrust[2] != 0);
            if(!this.freeze || (this.freeze && anyMovement)){
                newTimer = grenade.update(dt, playerVector.copy(), this.camPosition); // Update each grenade with the delta time and walls array
            }
            grenade.render(context, program_state, this.shapes, this.materials.light_src); // Render each grenade
            if(grenade.toExplode == true){
                let gPlayer = (grenade.position[0]-this.camPosition[0])**2 + (grenade.position[2]-this.camPosition[2])**2;

                this.flashGrenadeTimer = grenade.flashTime;
                
                
                
                grenade.toExplode = false;
            }
        });
 


        if(this.enemyParticleSystem != null){
            this.enemyParticleSystem.update(program_state.animation_delta_time / 1000);

            // Render the particle system
            this.enemyParticleSystem.render(context, program_state, this.shapes, this.materials.light_src);
        }
       
        this.tick = this.tick + 1;
        this.draw_crosshair();
        if(this.flashGrenadeTimer > 0){
           // console.log("About to explode");
            this.flashGrenadeTimer -= 1;
            this.flashEffect(gl, this.flashGrenadeTimer,false);
        }
        else if(this.freeze){
            this.flashEffect(gl, this.flashGrenadeTimer, true);
        }
    }

    createShaderProgram(gl, vertex_shader_source, fragment_shader_source) {
        // Create vertex shader
        let vertex_shader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertex_shader, vertex_shader_source);
        gl.compileShader(vertex_shader);
    
        // Create fragment shader
        let fragment_shader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragment_shader, fragment_shader_source);
        gl.compileShader(fragment_shader);
    
        // Create shader program
        let shader_program = gl.createProgram();
        gl.attachShader(shader_program, vertex_shader);
        gl.attachShader(shader_program, fragment_shader);
        gl.linkProgram(shader_program);
    
        return shader_program;
    }
    

    flashEffect(gl, t, isPurple){
        


        let vertex_shader_source = `
            attribute vec2 position;
            void main() {
                gl_Position = vec4(position, 0.0, 1.0);
            }
            `;

            // Fragment shader source code
            let fragment_shader_source = `
            precision mediump float;
            uniform float t;
            float x;
            void main() {
                if(t >120.0){
                    x = 0.9;
                }
                else{
                    x = t/150.0;
                }
                gl_FragColor = vec4(1.0, 1.0, 1.0, x); // White color
            }
            `;

            if(isPurple){
                
            

            fragment_shader_source = `
            precision mediump float;
            uniform float t;
            float x;
            void main() {
               
                gl_FragColor = vec4(0.2,0.0,0.8,0.09); // purple color
            }
            `;
        }


        

            // Create vertex shader
            let shader_program = this.createShaderProgram(gl, vertex_shader_source, fragment_shader_source);

    // Set the value of the t uniform
    let t_uniform_location = gl.getUniformLocation(shader_program, 't');
    gl.useProgram(shader_program); // Ensure correct shader program is active
    gl.uniform1f(t_uniform_location, t);

    // Define vertices and indices for a full-screen quad
    let vertices = new Float32Array([
        -1, -1,
        1, -1,
        1, 1,
        -1, 1,
    ]);

    let indices = new Uint16Array([
        0, 1, 2,
        0, 2, 3,
    ]);

    // Create vertex buffer for vertices
    let vertex_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Create index buffer for indices
    let index_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    // Bind the vertex buffer to attribute 0
    let position_attribute_location = gl.getAttribLocation(shader_program, 'position');
    gl.enableVertexAttribArray(position_attribute_location);
    gl.vertexAttribPointer(position_attribute_location, 2, gl.FLOAT, false, 0, 0);

    // Draw the quad using the index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    }

    make_new_smoke(list, position, dir, playerVec){
        list.push(new ParticleSystem(position, 10));
        return 0;
    }

    make_grenade_bomb(list, position, playerVector, incomDir, grenadeTimer){
        //
        let dotProduct = incomDir[0]*playerVector[0] + incomDir[1]*playerVector[1] + incomDir[2]*playerVector[2];
     //   console.log("hi2");
        //console.log(dotProduct);
        let mag1 = Math.sqrt(incomDir[0]**2 + incomDir[1]**2 + incomDir[2]**2);
        let mag2 = Math.sqrt(playerVector[0]**2 + playerVector[1]**2 + playerVector[2]**2);
        let cosAngle = dotProduct / (mag1*mag2);

       // console.log(cosAngle);
        let length = Math.round(50 * (cosAngle+1)) + 60;
     //   console.log("Called");
     //  console.log(length);
        
        grenadeTimer = length;
        return length;
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
              //  console.log('The pointer is now locked.');
                document.addEventListener('mousemove', updatePosition, false);
            } else {
              //  console.log('The pointer is now unlocked.');
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
           // console.log('Mouse moved:', movementX, movementY);


                        // Calculate the direction vector from camPosition to lookatpoint
            const direction = [
                this.lookatpoint[0] - this.camPosition[0],
                this.lookatpoint[1] - this.camPosition[1],
                this.lookatpoint[2] - this.camPosition[2]
            ];
            const radius = Math.sqrt(direction[0] * direction[0] + direction[1] * direction[1] + direction[2] * direction[2]);

            // Convert direction vector to spherical coordinates
            let theta = Math.atan2(direction[2], direction[0]); 
            let phi = Math.acos(direction[1] / radius); 
            let sens = 0.1;
            theta += movementX * sens * Math.PI / 180; // Horizontal movement
            phi += movementY * sens * Math.PI / 180; // Vertical movement
            const epsilon = 0.01; 
            phi = Math.max(0.01, Math.min(Math.PI - 0.01, phi));

            // Convert back to Cartesian coordinates
            this.lookatpoint[0] = this.camPosition[0] + radius * Math.sin(phi) * Math.cos(theta);
            this.lookatpoint[1] = this.camPosition[1] + radius * Math.cos(phi);
            this.lookatpoint[2] = this.camPosition[2] + radius * Math.sin(phi) * Math.sin(theta);

            // Set the new camera transformation
            this.camera_transformation.set(Mat4.look_at(this.camPosition, this.lookatpoint, this.upvector));

            /*
                let sens = 0.1;
                
                this.lookatpoint[1] += -1 * movementY * sens;
                this.lookatpoint[2] += movementX * sens;
                this.lookatpoint[0] -= movementX * sens; // NEEDS TO BE CHANGED
                this.camera_transformation.set(Mat4.look_at(this.camPosition, this.lookatpoint, this.upvector)); */
        
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
        this.live_string(box => box.textContent = "- Positione: " + this.camPosition[0].toFixed(2) + ", " + this.camPosition[1].toFixed(2)
            + ", " + this.camPosition[2].toFixed(2));
        this.new_line();
        // The facing directions are surprisingly affected by the left hand rule:
        this.live_string(box => box.textContent = "- Facing: " + ((this.z_axis[0] > 0 ? "West " : "East ")
            + (this.z_axis[1] > 0 ? "Down " : "Up ") + (this.z_axis[2] > 0 ? "North" : "South")));
        this.new_line();
        this.new_line();

        this.key_triggered_button("Up", [" "], () => {
            if(!this.jumpBool){
                this.jumpBool = true;
                this.jumpTime = 0;
                this.down = false;
                this.top = this.camPosition[1] + 5;
                this.endHeight = this.camPosition[1];   
                this.endHeightl = this.lookatpoint[1];
            }
        });        
        this.key_triggered_button("Forward", ["w"], () => this.thrust[2] = 0.1, undefined, () => this.thrust[2] = 0);
        this.new_line();
        this.key_triggered_button("Left", ["a"], () => this.thrust[0] = 0.1, undefined, () => this.thrust[0] = 0);
        this.key_triggered_button("Back", ["s"], () => this.thrust[2] = -0.1, undefined, () => this.thrust[2] = 0);
        this.key_triggered_button("Right", ["d"], () => this.thrust[0] = -0.1, undefined, () => this.thrust[0] = 0);
        this.new_line();
        this.key_triggered_button("Down", ["z"], () => this.thrust[1] = 1, undefined, () => this.thrust[1] = 0);
        this.key_triggered_button("Spawn Bullet", ["m"], () => this.spawn_projectile());
        this.key_triggered_button("Flash Demo", ["f"], () => this.needsFlash = !this.needsFlash);
        this.key_triggered_button("Time Freeze", ["t"], () => this.freeze = !this.freeze);
        this.key_triggered_button("No Death Demo", ["p"], () => this.canDie = !this.canDie);
        this.key_triggered_button("Teleport", ["c"], () => {
            if(this.player_transform_exists){
                this.camPosition = vec3(this.player_transform[0], 0.8, this.player_transform[2]);
                this.player_transform_exists = false;
            }
            else{
                this.player_transform_exists = true;
                this.player_transform = vec3(this.camPosition[0], -1, this.camPosition[2]);
            }
        
        })
        this.key_triggered_button("Spawn Grenade", ["g"], () => {
            this.grenadeList.push(new Grenade(this.camPosition, this.lookatpoint, this.smokeList, this.make_new_smoke, false, 10));
        });        
        const speed_controls = this.control_panel.appendChild(document.createElement("span"));
        speed_controls.style.margin = "30px";
       // this.key_triggered_button("-", ["o"], () =>
          //  this.speed_multiplier /= 1.2, undefined, undefined, undefined, speed_controls);
       // this.live_string(box => {
          //  box.textContent = "Speed: " + this.speed_multiplier.toFixed(2)
       // }, speed_controls);
      //  this.key_triggered_button("+", ["p"], () =>
          //  this.speed_multiplier *= 1.2, undefined, undefined, undefined, speed_controls);
      //  this.new_line();
      //  this.key_triggered_button("Roll left", [","], () => this.roll = 1, undefined, () => this.roll = 0);
      //  this.key_triggered_button("Roll right", ["."], () => this.roll = -1, undefined, () => this.roll = 0);
      //  this.new_line();
     //   //this.key_triggered_button("(Un)freeze mouse look around", ["f"], () => this.look_around_locked ^= 1, "#8B8885");
      //  this.new_line();
      /*
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
        */
    }

    first_person_flyaround(radians_per_frame, meters_per_frame, program_state, leeway = 0) {
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
           
        /*
        this.camPosition[0] += this.thrust[2];
        this.camPosition[2] += -1 * this.thrust[0];
        this.lookatpoint[0] += this.thrust[2];
        this.lookatpoint[2] += -1 * this.thrust[0];
        this.camera_transformation.set(Mat4.look_at(this.camPosition, this.lookatpoint, this.upvector)); */
        // Calculate the forward direction vector (from camPosition to lookatpoint)
        const forwardDirection = [
            this.lookatpoint[0] - this.camPosition[0],
            0, // Ignore the y component
            this.lookatpoint[2] - this.camPosition[2]
        ];

        // Normalize the forward direction vector
        const forwardLength = Math.sqrt(forwardDirection[0] * forwardDirection[0] + forwardDirection[2] * forwardDirection[2]);
        const normalizedForward = [
            forwardDirection[0] / forwardLength,
            0,
            forwardDirection[2] / forwardLength
        ];

        // Calculate the perpendicular direction vector in the x-z plane
        const perpendicularDirection = [
            -normalizedForward[2],
            0,
            normalizedForward[0]
        ];

        // Scale the direction vectors by the thrust
        const forwardMovement = [
            normalizedForward[0] * this.thrust[2],
            0,
            normalizedForward[2] * this.thrust[2]
        ];

        const sideMovement = [
            perpendicularDirection[0] * this.thrust[0] * 1.5,
            0,
            perpendicularDirection[2] * this.thrust[0] * 1.5
        ];

        if(this.jumpBool){
            if(this.jumpTime == 0){
                this.jumpTime = program_state.animation_time / 1000;
            }
            let t = program_state.animation_time / 1000;
            t -= this.jumpTime;
            let initial_velocity = 7;
            let down = (0.5 * -19.8 * (Math.pow(t, 2)));
            let vale = this.endHeight + (initial_velocity * t) + down;
            let valel = this.endHeightl + (initial_velocity * t) + down;
            this.camPosition[1] = vale;
            this.lookatpoint[1] = valel;
            

            if(this.camPosition[1] <= this.endHeight && (t!= 0)){
                this.camPosition[1] = this.endHeight;
                this.lookatpoint[1] = this.endHeightl;
                this.jumpBool = false;
                this.down = false;
                this.jumpTime = 0;
            }
            

        }

        // Update the camera position and lookat point with both forward and side movement
        this.camPosition[0] += forwardMovement[0] - sideMovement[0];
        this.camPosition[2] += forwardMovement[2] - sideMovement[2];
        this.lookatpoint[0] += forwardMovement[0] - sideMovement[0];
        this.lookatpoint[2] += forwardMovement[2] - sideMovement[2];
        
        // Set the new camera transformation
        this.camera_transformation.set(Mat4.look_at(this.camPosition, this.lookatpoint, this.upvector));

        this.pos = this.inverse().times(vec4(0, 0, 0, 1));
        this.z_axis = this.inverse().times(vec4(0, 0, 1, 0));

        let new_player_loc = vec4(this.camPosition[0],this.camPosition[1],this.camPosition[2], 1);
        
        //console.log("current position is " + this.);
       // console.log("current player position is " + this.person_location);


        const new_person_location_tips = this.get_person_box_tips(new_player_loc);

        let ok = true;

        ok = ok && this.check_person_colliding_wall(new_person_location_tips);
        if (!this.has_won) { // Only check the winning condition if the game is not already won
            ok = ok && this.check_winning_condition(new_person_location_tips);
        }
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

class Particle {
    constructor(position, velocity, lifespan) {
        this.position = position.copy();
        this.velocity = velocity;
        this.lifespan = lifespan;
        this.age = 0;
    }

    update(dt) {
        // Update particle position based on velocity
        //this.position[1] = this.position[1] + (this.velocity.times(dt));
        this.position[1] = this.position[1] + dt * this.velocity[1];
        // Update particle age
        this.age += dt;
        
    }

    isAlive() {
        return this.age < this.lifespan;
    }

    render(context, program_state, shapes, material) {
        // Render the particle (using a simple sphere or point for demonstration)
        let model_transform = Mat4.translation(...this.position);
        model_transform = model_transform.times(Mat4.scale(0.2,0.2,0.2));
        // Adjust size based on age (optional)
        const size = 1.0 - (this.age / this.lifespan);
        const scaled_transform = model_transform.times(Mat4.scale(size, size, size));
       
        // Assuming there's a draw_sphere function available for rendering
        shapes.sphere.draw(context, program_state, scaled_transform, material); //Color.of(0.5, 0.5, 0.5, 1.0 - this.age / this.lifespan
    }
}

class ParticleSystem {
    constructor(origin, timer) {
        this.age = 0;
        this.timer = timer;
        this.origin = origin;
        this.particles = [];
        this.active = true;
        this.nothingLeft = false;
    }

    emitParticle() {
        if(!this.active){
            return;
        }
        // Create a new particle with random velocity and lifespan
        const velocity = vec3(Math.random() - 0.5, 2*Math.random() + 0.5, Math.random() - 0.5);
        const randomPos = vec3(2 * Math.random() - 1, 0, 2 * Math.random() - 2);
        const lifespan = Math.random() * 10 + 1; 
        const particle = new Particle(this.origin.copy().plus(randomPos), velocity, lifespan);
        this.particles.push(particle);
    }

    update(dt) {
        // Emit new particles
        this.emitParticle();
        // Update all particles
        this.particles.forEach(particle => particle.update(dt));
        // Remove dead particles
        this.particles = this.particles.filter(particle => particle.isAlive());
        if(this.particles.length == 0){
            this.nothingLeft = true;
        }
        this.age += dt;
        if(this.age > this.timer){
            this.active = false;
        }
    }

    render(context, program_state, shapes, material) {
        // Render all particles
        this.particles.forEach(particle => particle.render(context, program_state, shapes, material));
    }
}


class Grenade {
    constructor(camPosition, lookatpoint, objectlist, func, flash, drt, timer) {
        // Calculate the initial velocity based on the direction vector (lookatpoint - camPosition)
        const direction = lookatpoint.minus(camPosition).normalized();
        const speed = drt; // Adjust speed as necessary
        this.velocity = direction.times(speed);
        // Set the initial position to the camera position
        this.position = camPosition.copy();
        
        // Gravity constant
        this.gravity = vec3(0, -9.8, 0);
        
        // Initial time
        this.time = 0;
        
        // Explosion countdown (in seconds)
        this.explosionCountdown = 0.7;
        // Check if grenade has exploded
        this.exploded = false;
        this.prev;
        this.mainList = objectlist;
        this.func = func;
        this.flash = flash;
        this.toExplode = false;
        this.newDir;
        this.timeGrenade = timer;
        this.flashTime = 0;
    }
    
    // Update grenade position based on projectile motion equations
    update(dt,playerVec, playerPoint) {
        if (this.exploded) return;

        this.time += dt;
        this.prev = this.position.copy()
        // Update position based on kinematics equations
        this.position = this.position.plus(this.velocity.times(dt)).plus(this.gravity.times(0.5 * dt * dt));
        
        // Update velocity based on gravity
        this.velocity = this.velocity.plus(this.gravity.times(dt));
        
        // Check for collision with walls and handle reflection
        //this.handleCollisions(walls);
        
        // Check for collision with ground
        if (this.position[1] <= 0) {
            this.position[1] = 0; // Ensure grenade doesn't go below ground
            this.velocity[1] = 0; // Stop vertical movement
        }
        
        // Check if it's time to explode
        if (this.time >= this.explosionCountdown) {
            return this.explode(playerVec.copy(), playerPoint);
        }
        return 0;
    }

    // Handle explosion
    explode(playerVec, playerPoint) {
        this.exploded = true;
        //this.mainList.push(new ParticleSystem(this.prev, 10));
       // console.log("Outer");
       // console.log(playerVec);
        this.newDir = playerVec;
        let grenadeVect = this.position.minus(playerPoint).normalized();
        if(this.flash){
            this.toExplode = true;
        }
        this.flashTime = this.func(this.mainList, this.prev, this.newDir, grenadeVect, this.grenadeTimer);
        
  
        

        // Spawn ParticleSystem at the grenade's position
        // new ParticleSystem(this.position);
    }

    // Render the grenade
    render(context, program_state, shapes, material) {
        if (this.exploded) return;

        // Grenade rendering logic
        const model_transform = Mat4.translation(...this.position).times(Mat4.scale(0.2, 0.2, 0.2));
        shapes.sphere.draw(context, program_state, model_transform, material);
    }

    // Calculate offsets for bounding box corners
    get_offsets(base) {
        return [
            vec(base, -base),
            vec(base, base),
            vec(-base, base),
            vec(-base, -base)
        ];
    }

    // Get bounding box tips for a wall brick
    get_wall_brick_box_tips(box_location) {
        const base = 1; // the size of the box is set to 1
        const offsets = this.get_offsets(base); // uses get_offsets(base) to get the corners of the box relative to its center
        let res = [];
        for (let offset of offsets) {
            res.push(
                vec(box_location[0] + offset[0], -box_location[2] - offset[1])
            )
        }
        return res; // the coordinates are stored in the res array
    }

    // Check for collision between two 1D intervals
    box_collide_1d(box1, box2) {
        const xmin1 = box1[0];
        const xmax1 = box1[1];
        const xmin2 = box2[0];
        const xmax2 = box2[1];
        return xmax1 >= xmin2 && xmax2 >= xmin1;
    }

    // Check for collision between two 2D boxes
    box_collide_2d(box1, box2) {
        const xmin1 = Math.min(...box1.map(c => c[0]));
        const xmax1 = Math.max(...box1.map(c => c[0]));
        const ymin1 = Math.min(...box1.map(c => c[1]));
        const ymax1 = Math.max(...box1.map(c => c[1]));
        const xmin2 = Math.min(...box2.map(c => c[0]));
        const xmax2 = Math.max(...box2.map(c => c[0]));
        const ymin2 = Math.min(...box2.map(c => c[1]));
        const ymax2 = Math.max(...box2.map(c => c[1]));

        return this.box_collide_1d([xmin1, xmax1], [xmin2, xmax2]) &&
            this.box_collide_1d([ymin1, ymax1], [ymin2, ymax2]);
    }
}



const Whiteout_Shader = tiny.Shader = 
    class Whiteout_Shader extends tiny.Shader {
        
        // Define the vertex shader
        vertex_glsl_code() {
            return `
                attribute vec3 position;
                uniform mat4 model_transform;
                uniform mat4 projection_camera_model_transform;

                void main() {
                    gl_Position = projection_camera_model_transform * vec4(position, 1.0);
                }
            `;
        }

        // Define the fragment shader
        fragment_glsl_code() {
            return `
                precision mediump float;
                uniform bool whiteout;

                void main() {
                    if (whiteout) {
                        gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); // Set every pixel to white
                    } else {
                        gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); // Placeholder: black color
                    }
                }
            `;
        }

        // Update the GPU with the uniform variable
        update_GPU(context, gpu_addresses, program_state, model_transform, material) {
            let [P, C, M] = [program_state.projection_transform, program_state.camera_inverse, model_transform];
            context.uniformMatrix4fv(gpu_addresses.projection_camera_model_transform, false, Mat4.identity().times(P).times(C).times(M).flat());
            context.uniformMatrix4fv(gpu_addresses.model_transform, false, Mat4.identity().times(M).flat());
            context.uniform1i(gpu_addresses.whiteout, material.whiteout);
        }
    }