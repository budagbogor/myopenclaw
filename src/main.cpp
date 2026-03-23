#include <SDL.h>

#include <cstdint>
#include <iostream>

static void LogSdlError(const char* context)
{
    std::cerr << context << ": " << SDL_GetError() << "\n";
}

int main(int argc, char** argv)
{
    (void)argc;
    (void)argv;

    SDL_SetMainReady();

    if (SDL_Init(SDL_INIT_VIDEO | SDL_INIT_GAMECONTROLLER) != 0)
    {
        LogSdlError("SDL_Init failed");
        return 1;
    }

    SDL_Window* window = SDL_CreateWindow(
        "MyClaw Engine - Phase 1 (MVP)",
        SDL_WINDOWPOS_CENTERED,
        SDL_WINDOWPOS_CENTERED,
        1280,
        720,
        SDL_WINDOW_SHOWN
    );

    if (!window)
    {
        LogSdlError("SDL_CreateWindow failed");
        SDL_Quit();
        return 1;
    }

    SDL_Renderer* renderer = SDL_CreateRenderer(
        window,
        -1,
        SDL_RENDERER_ACCELERATED | SDL_RENDERER_PRESENTVSYNC
    );

    if (!renderer)
    {
        renderer = SDL_CreateRenderer(window, -1, SDL_RENDERER_SOFTWARE);
    }

    if (!renderer)
    {
        LogSdlError("SDL_CreateRenderer failed");
        SDL_DestroyWindow(window);
        SDL_Quit();
        return 1;
    }

    bool running = true;
    std::uint32_t lastTicks = SDL_GetTicks();

    while (running)
    {
        SDL_Event event{};
        while (SDL_PollEvent(&event))
        {
            if (event.type == SDL_QUIT)
            {
                running = false;
            }
            else if (event.type == SDL_KEYDOWN)
            {
                if (event.key.keysym.sym == SDLK_ESCAPE)
                {
                    running = false;
                }
            }
        }

        const std::uint32_t nowTicks = SDL_GetTicks();
        const std::uint32_t frameMs = nowTicks - lastTicks;
        lastTicks = nowTicks;
        (void)frameMs;

        SDL_SetRenderDrawColor(renderer, 18, 24, 38, 255);
        SDL_RenderClear(renderer);

        SDL_SetRenderDrawColor(renderer, 28, 39, 58, 255);
        SDL_Rect ground{0, 620, 1280, 100};
        SDL_RenderFillRect(renderer, &ground);

        SDL_Rect sprite{(1280 - 64) / 2, 620 - 96, 64, 96};
        SDL_SetRenderDrawColor(renderer, 224, 196, 64, 255);
        SDL_RenderFillRect(renderer, &sprite);

        SDL_SetRenderDrawColor(renderer, 18, 14, 8, 255);
        SDL_RenderDrawRect(renderer, &sprite);

        SDL_RenderPresent(renderer);
    }

    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    return 0;
}
