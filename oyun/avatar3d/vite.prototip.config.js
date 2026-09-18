import {defineConfig,mergeConfig} from 'vite';
import anaConfig from '../../vite.config.js';
export default defineConfig(env=>mergeConfig(anaConfig(env),{
  build:{rollupOptions:{input:{oyun:'index.html',atolye:'oyun/avatar3d/index.html',meydan:'oyun/avatar3d/meydan.html',gardrop:'oyun/avatar3d/gardrop.html'}}},
  server:{host:'127.0.0.1',port:4190,strictPort:true},
  preview:{host:'127.0.0.1',port:4190,strictPort:true},
}));
