/** Open a native file picker (Electron IPC) or fallback to <input type="file"> */
export interface PickedResult {
  filePath: string
  fileName: string
  blob?: Blob
}

export async function openFilePicker(opts: {
  accept?: string
  extensions?: string[]
}): Promise<PickedResult | null> {
  type ElectronAPI = {
    openFileDialog: (
      o: unknown,
    ) => Promise<{
      filePath: string
      fileName: string
    } | null>
    readFile: (p: string) => Promise<ArrayBuffer>
  }
  const eAPI = (window as unknown as { electronAPI?: ElectronAPI }).electronAPI

  if (eAPI) {
    const picked = await eAPI.openFileDialog({
      filters: opts.extensions
        ? [{ name: "File", extensions: opts.extensions }]
        : [{ name: "All Files", extensions: ["*"] }],
      properties: ["openFile"],
    })
    if (!picked) return null
    const buf = await eAPI.readFile(picked.filePath)
    const ext = picked.fileName.split(".").pop()?.toLowerCase() ?? ""
    const mime =
      ext === "pdf"
        ? "application/pdf"
        : ext === "png"
          ? "image/png"
          : ext === "jpg" || ext === "jpeg"
            ? "image/jpeg"
            : ext === "xlsx"
              ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              : ext === "docx"
                ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                : "application/octet-stream"
    return {
      filePath: picked.filePath,
      fileName: picked.fileName,
      blob: new Blob([buf], { type: mime }),
    }
  }

  // Browser fallback
  return new Promise((resolve) => {
    const input = document.createElement("input")
    input.type = "file"
    if (opts.accept) input.accept = opts.accept
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) {
        resolve(null)
        return
      }
      resolve({
        filePath: URL.createObjectURL(file),
        fileName: file.name,
        blob: file,
      })
    }
    input.click()
  })
}
