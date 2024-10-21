# Temporal Hunter

- Developed an open-world game using OpenGL and GLFW, optimizing pipeline with custom GLSL shaders for real-time ray
tracing and adaptive sampling to improve rendering time by 20%

- Engineered high-performance particle system utilizing GPU instancing and deferred shading to render over 10,000 particles
simultaneously without sacrificing frame rate

- Integrated a multi-resolution rendering technique using OpenGL’s LOD management and mipmapping with texture atlases,
reducing GPU memory bandwidth usage by 30%


In Temporal Hunter, you are thrust into the role of the main character trapped within a maze. The camera is placed in first person, and as you navigate this labyrinth, your goal is clear: find the treasure box. The maze is filled with textured hallways, dead-ends, and hostile entities determined to stop you. As you try to find the box, you will encounter enemies that attempt to destroy you by shooting bullets. It is your responsibility to fight back by shooting your own bullets at them. If the user is hit by a bullet, the game ends. 

The essence of Temporal Hunter lies in its unique manipulation of time. Like in the classic game Superhot, time moves only when you move the character. When you are not moving, bullets hover mid-air and enemies freeze in place, allowing you to plan your next move. So only when you move do your surroundings also move. But, remember that you have a limited time to escape (shown by the timer)! What this means is that you cannot remain in the stationary position to decide on your move forever. You must both think and act fast in order to escape.
