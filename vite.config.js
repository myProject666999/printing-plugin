import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.js'),
      name: 'PrintingPlugin',
      fileName: (format) => `printing-plugin.${format}.js`,
    },
    rollupOptions: {
      output: {
        exports: 'named',
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
