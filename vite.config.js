import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      'phaser': 'phaser/dist/phaser.js'
    }
  },
  server: {
    port: 5173
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        onboarding: resolve(__dirname, 'onboarding.html'),
        journal: resolve(__dirname, 'QuantumSense Ai Journal-Add on /index.html')
      }
    }
  }
});
