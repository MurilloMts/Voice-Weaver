/** @type {import('tailwindcss').Config} */
    export default {
      content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
      ],
      theme: {
        extend: {
          colors: {
            'black-gold': {
              50: '#fbf9f0',
              100: '#f7f2e1',
              200: '#eee5c3',
              300: '#e5d8a5',
              400: '#dcd187',
              500: '#d3ca69',
              600: '#cabe4b',
              700: '#c1b62d',
              800: '#b7ad0f',
              900: '#ada500',
            },
          },
        },
      },
      plugins: [],
    }
