import { useEffect, useRef, useState } from 'react'
import { Canvas, sceneSvg } from './components/Canvas'
import { RequestPanel } from './components/RequestPanel'
import { ScenePanel } from './components/ScenePanel'
import { importAsset } from './lib/assets'
import { FRAME_HEIGHT, FRAME_WIDTH } from './lib/frame'
import { errorMessage, loadLibrary } from './lib/library'
import { useStudio } from './store'

function downloadScene() {
  const blob = new Blob([sceneSvg()], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'illustration.svg'
  anchor.click()
  // Let the browser start the download before invalidating the object URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function App() {
  const addAssets = useStudio(state => state.addAssets)
  const hasScene = useStudio(state => state.scene.length > 0)
  const fileInput = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [loadWarnings, setLoadWarnings] = useState<string[]>([])
  const [importWarnings, setImportWarnings] = useState<string[]>([])

  useEffect(() => {
    const controller = new AbortController()
    void loadLibrary(controller.signal).then(({ assets, warnings }) => {
      if (controller.signal.aborted) return
      addAssets(assets)
      setLoadWarnings(warnings)
    }).catch(error => {
      if (!controller.signal.aborted) setLoadWarnings([errorMessage(error)])
    })
    return () => controller.abort()
  }, [addAssets])

  async function handleImport(files: FileList | null) {
    if (!files?.length) return
    setImporting(true)
    try {
      const results = await Promise.allSettled([...files].map(file => importAsset(file, 'main', 'rich')))
      addAssets(results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []))
      setImportWarnings(results.flatMap((result, index) => result.status === 'rejected'
        ? [`${files[index].name}: ${errorMessage(result.reason)}`]
        : []))
    } finally {
      setImporting(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <main className="app-shell">
      <input
        ref={fileInput}
        type="file"
        accept=".svg,image/svg+xml"
        multiple
        hidden
        onChange={event => void handleImport(event.target.files)}
      />
      <section className="workspace">
        <RequestPanel importing={importing} onImport={() => fileInput.current?.click()} />
        <section className="stage" aria-label="Холст">
          <div className="stage-bar">
            <span>{FRAME_WIDTH} × {FRAME_HEIGHT}</span>
            <button type="button" disabled={!hasScene} onClick={downloadScene}>Скачать SVG ↗</button>
          </div>
          <Canvas />
        </section>
        <ScenePanel libraryWarnings={[...loadWarnings, ...importWarnings]} />
      </section>
    </main>
  )
}
