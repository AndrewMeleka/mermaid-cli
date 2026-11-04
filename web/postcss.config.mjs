import stylex from "@stylexjs/postcss-plugin";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dev = process.env.NODE_ENV !== "production";

// Must mirror the babel options in vite.config.ts or class hashes diverge.
export default {
  plugins: [
    stylex({
      include: ["src/**/*.{ts,tsx}"],
      useCSSLayers: true,
      babelConfig: {
        babelrc: false,
        parserOpts: { plugins: ["typescript", "jsx"] },
        plugins: [
          [
            "@stylexjs/babel-plugin",
            {
              dev,
              runtimeInjection: false,
              treeshakeCompensation: true,
              unstable_moduleResolution: { type: "commonJS", rootDir: __dirname },
            },
          ],
        ],
      },
    }),
  ],
};
