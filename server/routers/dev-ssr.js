const Router = require('koa-router')
const axios = require('axios')
const fs = require('fs')
const MemoryFs = require('memory-fs')
const webpack = require('webpack')
const VueServerRenderer = require('vue-server-renderer')
const path = require('path')
const serverRenderer = require('./server.renderer')

const serverConfig = require('../../build/webpack.server.conf')

const serverCompiler = webpack(serverConfig)

const mfs = new MemoryFs()

serverCompiler.outputFileSystem = mfs

let bundle
serverCompiler.watch({}, (err, stats) => {
  if (err) throw err
  stats = stats.toJson()
  stats.errors.forEach((err) => console.log(err))
  stats.warnings.forEach(warn => console.log(warn))
  
  const bundlePath = path.join(
    serverConfig.output.path,
    'vue-ssr-server-bundle.json'
  )
  console.log('bundlePath:', bundlePath)
  bundle = JSON.parse(mfs.readFileSync(bundlePath, 'utf-8'))
})

const handleSSR = async (ctx) => {
  
  const clientManifestResp = await axios.get(
    'http://127.0.0.1:8080/vue-ssr-client-manifest.json'
  )
  const clientManifest = clientManifestResp.data
  
  if (!bundle) {
    ctx.body = '请稍等~~~'
  } else {
    const template = fs.readFileSync(
      path.join(__dirname, '../server.template.ejs'),
      'utf-8'
    )
    
    const render = VueServerRenderer.createBundleRenderer(bundle, {
      inject: false,
      clientManifest
    })
    
    await serverRenderer(ctx, render, template)
  }
}

const router = new Router()

router.get('*', handleSSR)

module.exports = router
