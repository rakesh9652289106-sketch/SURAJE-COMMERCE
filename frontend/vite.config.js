import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        category: resolve(__dirname, 'category.html'),
        admin: resolve(__dirname, 'admin.html'),
        brands: resolve(__dirname, 'brands.html'),
        profile: resolve(__dirname, 'profile.html'),
        support: resolve(__dirname, 'support.html'),
        wishlist: resolve(__dirname, 'wishlist.html'),
      }
    }
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
});
