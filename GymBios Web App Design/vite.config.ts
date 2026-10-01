import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

// Figma Make exports import packages with a pinned version, e.g.
// "@radix-ui/react-progress@1.1.2" or "sonner@2.0.3". Strip the version so Vite
// resolves the installed package instead.
function versionedImportResolver() {
  const versioned = /^((?:@[^/@]+\/)?[^/@]+)@\d[^/]*(\/.*)?$/
  return {
    name: 'versioned-import-resolver',
    enforce: 'pre' as const,
    async resolveId(id: string, importer: string | undefined) {
      const m = id.match(versioned)
      if (!m) return null
      return this.resolve(m[1] + (m[2] ?? ''), importer, { skipSelf: true })
    },
  }
}

export default defineConfig({
  plugins: [
    versionedImportResolver(),
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/app'),
    },
  },
})
