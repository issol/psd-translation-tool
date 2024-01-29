# PSD-tranlsation-tool

This project, named "PSD-tranlsation-tool", is a web application built with Next.js, and TypeScript. It utilizes web workers to perform heavy computations in the background, without blocking the main thread. Upload files in PSD, PSB, JPG, and PNG formats, place the speech bubbles where you want to translate them, and export the grouped speech bubbles along with the original file when you're done.

## Features

- File Upload: Users can upload `.psd`, `.psb`, `.png`, `.jpg`, `.jpeg` files. The application reads these files as `ArrayBuffer` and performs different operations based on the file type.
- Web Workers: The application uses web workers to parse data from `.psd` and `.psb` files and to perform operations on image layers. This allows these heavy computations to be performed in the background, without blocking the main thread.
- Image and PSD, PSB Rendering: The application can render `.png`, `.jpg`, `.jpeg` files in the browser. For image files, it converts them to canvas elements and appends them to the DOM.

## Libraries Used

- Next.js: A React framework for building JavaScript applications.
- React: A JavaScript library for building user interfaces.
- TypeScript: A typed superset of JavaScript that compiles to plain JavaScript.
- @emotion/react and @emotion/styled: Libraries for writing CSS styles with JavaScript.
- @mui/icons-material and @mui/material: Material-UI libraries for using Material Design icons and components.
- @webtoon/psd and ag-psd: Libraries for parsing PSD files.
- react-dropzone: A React library for creating HTML5-compliant drag'n'drop file zones.
- recoil: A state management library for React.
- ag-psd : Libraries for reading and writing files in PSD and PSB formats.

## Getting Started

To get started with this project, clone the repository and install the dependencies:

```bash
git clone <repository-url>
cd <repository-directory>
npm install
