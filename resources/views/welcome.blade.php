<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Laravel</title>
        @vite(['resources/css/app.css', 'resources/js/app.js'])
    </head>
    <body class="antialiased">
        <div class="relative sm:flex sm:justify-center sm:items-center min-h-screen bg-dots-darker bg-center bg-gray-100 dark:bg-dots-lighter dark:bg-gray-900 selection:bg-red-500 selection:text-white">
            <div class="max-w-7xl mx-auto p-6 lg:p-8">
                <div class="flex justify-center">
                    <svg viewBox="0 0 341 65" fill="none" xmlns="http://www.w3.org/2000/svg" class="h-16 w-auto bg-gray-100 dark:bg-gray-800">
                        <path d="M175.58 65.0002C165.5 65.0002 156.58 62.0935 148.83 56.2802C141.08 50.3602 135.5 42.7335 132.08 33.4002C128.663 24.0668 126.455 13.5202 125.455 1.76016H141.08C141.773 10.6935 143.273 18.5202 145.58 25.2402C147.887 31.8535 151.273 37.1735 155.74 41.2002C160.313 45.2268 166.08 47.2402 173.04 47.2402C179.893 47.2402 185.663 45.2268 190.35 41.2002C195.14 37.1735 198.527 31.8535 200.52 25.2402C202.62 18.5202 203.673 10.6935 203.673 1.76016H219.298C218.298 13.5202 216.09 24.0668 212.673 33.4002C209.35 42.7335 203.773 50.3602 196.04 56.2802C188.298 62.0935 179.38 65.0002 169.298 65.0002H175.58Z" fill="#FF2D20"/>
                    </svg>
                </div>
                <div class="mt-16 flex justify-center">
                    <a href="{{ route('login') }}" class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded">
                        Get Started
                    </a>
                </div>

                <div class="mt-16">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                        <a href="https://laravel.com/docs" class="scale-100 p-6 bg-white dark:bg-gray-800/50 dark:bg-gradient-to-bl from-gray-700/50 via-transparent dark:ring-1 dark:ring-inset dark:ring-white/5 rounded-lg shadow-2xl shadow-gray-500/20 dark:shadow-none flex flex-col gap-6 focus:outline focus:outline-2 focus:outline-red-500">
                            <div>
                                <div class="flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" class="self-center shrink-0 stroke-red-500 w-6 h-6 mx-6">
                                        <path stroke-linecap="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                                    </svg>
                                    <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Documentation</h2>
                                </div>
                                <p class="mt-4 text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                                    Laravel has wonderful documentation covering every aspect of the framework. Whether you're a beginner or have prior experience with Laravel, we recommend reading our documentation from beginning to end.
                                </p>
                            </div>
                            <div class="flex items-center gap-1 text-red-500 fill-red-500">
                                <span>Explore the documentation</span>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" class="w-5 h-5">
                                    <path fill-rule="evenodd" d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0V6.5a.75.75 0 00-.75-.75h-6.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z" clip-rule="evenodd" />
                                </svg>
                            </div>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </body>
</html>

