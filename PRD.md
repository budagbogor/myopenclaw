# Product Requirements Document (PRD): MyClaw Engine

## **1. Vision & Overview**
**MyClaw Engine** is a modern, high-performance 2D platformer engine inspired by the classic 1997 game **Captain Claw**. It aims to provide a robust, cross-platform foundation for building action-platformers with arcade-style combat and precise movement mechanics, similar to the **OpenClaw** project.

### **Core Objectives**
- **Faithful Mechanics**: Reproduce the "feel" of classic platformers (jumping, sliding, combat).
- **Modern Performance**: Hardware-accelerated rendering (OpenGL/Vulkan) and efficient memory management.
- **Cross-Platform**: Support Windows, Linux, macOS, and Web (WebAssembly).
- **Extensibility**: Support for custom levels, assets, and scripted events.

---

## **2. Target Audience**
- **Retro Game Enthusiasts**: Players looking to relive the Captain Claw experience on modern hardware.
- **Indie Game Developers**: Developers seeking a solid 2D engine specialized for action-platformers.
- **Educational Users**: Students learning game engine architecture and C++.

---

## **3. Functional Requirements**

### **3.1 Core Game Engine**
- **Game Loop**: A high-precision game loop with decoupled update and render cycles.
- **Rendering**: 
  - Hardware-accelerated 2D sprite rendering.
  - Support for layers (background, parallax, foreground).
  - Particle systems for effects (dust, explosions).
- **Input System**: Support for keyboard, mouse, and modern gamepads (via SDL2).
- **Physics**: 
  - Tile-based collision detection.
  - Character physics (gravity, friction, acceleration).
  - Support for moving platforms and slopes.

### **3.2 Asset Management**
- **Asset Loader**:
  - Primary: Modern formats (PNG, MP3/WAV, JSON/XML).
  - Secondary (Optional): Support for original `CLAW.REZ` game archives for compatibility.
- **Resource Management**: Efficient loading and caching of textures and sounds.

### **3.3 Game Mechanics**
- **Combat System**: Melee (sword), ranged (pistol/magic), and special abilities.
- **AI Engine**: Pattern-based enemy AI with state machines (Idle, Patrol, Attack, Flee).
- **Level System**: Support for complex tile-based levels with interactive objects (levers, doors, secrets).
- **UI/HUD**: Health bars, score counters, inventory, and menus.

### **3.4 Tools & Extensibility**
- **Level Editor Compatibility**: Export/Import support for tools like **Tiled**.
- **Scripting**: Lua or similar scripting language for custom event triggers and game logic.

---

## **4. Non-Functional Requirements**
- **Performance**: Maintain 60+ FPS on low-end modern hardware.
- **Portability**: Codebase must compile on multiple OS with minimal platform-specific code.
- **Reliability**: Robust error handling for asset loading and hardware failures.

---

## **5. Technical Stack (Recommended)**
- **Language**: C++20
- **Build System**: CMake
- **Graphics & Input**: SDL2
- **Audio**: SDL_mixer or OpenAL
- **Rendering API**: OpenGL 3.3+ (Core Profile) or Vulkan
- **Serialization**: nlohmann/json for config and level data
- **Web Support**: Emscripten (WASM)

---

## **6. Roadmap & Phases**

### **Phase 1: Foundation (MVP)**
- Setup project structure and build system.
- Basic window creation and rendering loop.
- Simple sprite display and movement.

### **Phase 2: Mechanics & Physics**
- Tile-based collision system.
- Basic physics (jumping, gravity).
- Keyboard input handling.

### **Phase 3: Assets & Levels**
- Asset loader for PNG and JSON.
- Level loading from file.
- Basic HUD.

### **Phase 4: Combat & AI**
- Combat mechanics (melee/ranged).
- Simple enemy AI.
- Sound and music integration.

### **Phase 5: Refinement & Porting**
- Polish animations and effects.
- Web/WASM build testing.
- Final documentation.
