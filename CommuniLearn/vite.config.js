import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { networkInterfaces } from 'os'

function getLocalExternalIp() {
    const nets = networkInterfaces()
    for (const name of Object.keys(nets)) {
        const netInfo = nets[name]
        if (!netInfo) continue
        for (const iface of netInfo) {
            if (iface.family === 'IPv4' && !iface.internal) return iface.address
        }
    }
    return undefined
}

const localIp = getLocalExternalIp()
const apiTarget = `http://${localIp || 'localhost'}:5000`

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        // Allow access from LAN devices
        host: true, // same as '0.0.0.0'
        port: 5173,
        // HMR needs to know the client-accessible host when accessed from other devices.
        hmr: {
            host: localIp || undefined,
        },
        // Dev proxy: forward /api requests to your backend so the browser sees same-origin
        proxy: {
            '/api': {
                target: apiTarget,
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/api/, ''),
            },
        },
    },
})
