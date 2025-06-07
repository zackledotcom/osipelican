module.exports = {
  appId: 'com.osipelican.app',
  productName: 'HelloGPT',
  directories: {
    output: 'dist',
    buildResources: 'buildResources'
  },
  files: [
    'dist/**/*',
    'package.json'
  ],
  mac: {
    category: 'public.app-category.developer-tools',
    target: ['dmg', 'zip'],
    icon: 'buildResources/icon.icns',
    darkModeSupport: true
  },
  win: {
    target: ['nsis', 'portable'],
    icon: 'buildResources/icon.png'
  },
  linux: {
    target: ['AppImage', 'deb'],
    category: 'Development',
    icon: 'buildResources/icon.png'
  },
  extraResources: [
    {
      from: 'buildResources',
      to: 'buildResources',
      filter: ['**/*']
    }
  ],
  publish: {
    provider: 'github',
    releaseType: 'release'
  }
}; 