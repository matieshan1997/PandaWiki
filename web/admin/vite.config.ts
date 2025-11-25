import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ command, mode }) => {
  // 加载环境变量 - 第二个参数是目录路径，不是文件名
  const env = loadEnv(mode, process.cwd(), '');
  const shouldAnalyze =
    process.argv.includes('--analyze') || env.ANALYZE === 'true';
  return {
    server: {
      hmr: true,
      proxy: {
        '/api': {
          target: env.TARGET,
          secure: false,
          changeOrigin: true,
        },
        '/static-file': {
          target: env.STATIC_FILE_TARGET,
          secure: false,
          changeOrigin: true,
        },
        '/share': {
          target: env.SHARE_TARGET,
          secure: false,
          changeOrigin: true,
        },
      },
      host: '0.0.0.0',
    },
    esbuild: {
      // 保留函数和类名，避免第三方库依赖 constructor.name 的逻辑在压缩后失效
      keepNames: true,
    },
    plugins: [
      react(),
      ...(command === 'build' && shouldAnalyze
        ? [
            visualizer({
              open: true, // 在默认浏览器中自动打开报告
              gzipSize: true, // 显示 gzip 格式下的包大小
              brotliSize: true, // 显示 brotli 格式下的包大小
              filename: 'dist/stats.html', // 分析图生成的文件名
            }),
          ]
        : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
  };
});
