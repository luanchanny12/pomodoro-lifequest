import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileSpreadsheet, FileJson, X, Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useBulkCreateVocabulary, useImportVocabularyFile } from '@/services/vocabularyService'
import { cn } from '@/lib/utils'
import type { VocabularyImportResult } from '@/types'

interface PreviewItem {
  word: string; meaning: string; example?: string; category?: string; type?: string
}

export default function ImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [preview, setPreview] = useState<PreviewItem[]>([])
  const [result, setResult] = useState<VocabularyImportResult | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const bulkCreate = useBulkCreateVocabulary()
  const importFile = useImportVocabularyFile()

  function reset() {
    setPreview([])
    setResult(null)
  }

  function handleClose() {
    reset()
    onOpenChange(false)
  }

  async function parseFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'json') {
      const text = await file.text()
      let raw: any
      try { raw = JSON.parse(text) } catch { return }
      const items = Array.isArray(raw) ? raw : raw.items
      if (items) setPreview(items.map((i: any) => ({
        word: i.word || '', meaning: i.meaning || '',
        example: i.example, category: i.category, type: i.type || 'word',
      })))
    } else if (ext === 'xlsx') {
      importFile.mutate(file, {
        onSuccess: (res) => setResult(res),
      })
    }
  }

  async function handleImport() {
    if (preview.length === 0) return
    bulkCreate.mutate(preview, {
      onSuccess: (res) => { setResult(res); setPreview([]) },
    })
  }

  function downloadTemplate() {
    const rows = [['word', 'meaning', 'example', 'category', 'type']]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'vocabulary_template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(v) }}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nhập từ vựng hàng loạt</DialogTitle>
          <DialogDescription>Hỗ trợ file Excel (.xlsx) hoặc JSON. Có thể import cả từ đơn và cụm từ.</DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className={cn(
              'rounded-lg border p-4 flex items-center gap-3',
              result.errors.length === 0 ? 'border-green-200 bg-green-50 dark:bg-green-950/20' : 'border-amber-200 bg-amber-50 dark:bg-amber-950/20'
            )}>
              {result.errors.length === 0
                ? <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
                : <AlertCircle className="h-8 w-8 text-amber-500 shrink-0" />
              }
              <div>
                <p className="font-medium">
                  Đã import {result.imported}/{result.total} từ vựng
                </p>
                {result.errors.length > 0 && (
                  <ul className="text-sm text-muted-foreground mt-1 space-y-0.5">
                    {result.errors.slice(0, 10).map((e, i) => <li key={i}>- {e}</li>)}
                    {result.errors.length > 10 && <li>...và {result.errors.length - 10} lỗi khác</li>}
                  </ul>
                )}
              </div>
            </div>
            <Button className="w-full" onClick={handleClose}>Đóng</Button>
          </div>
        ) : preview.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Xem trước {preview.length} mục:</p>
            <div className="max-h-48 overflow-y-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Từ/Cụm</th>
                    <th className="px-3 py-2 text-left font-medium">Nghĩa</th>
                    <th className="px-3 py-2 text-left font-medium">Loại</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((item, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2">{item.word}</td>
                      <td className="px-3 py-2 text-muted-foreground">{item.meaning}</td>
                      <td className="px-3 py-2">
                        <span className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                          item.type === 'phrase'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        )}>
                          {item.type === 'phrase' ? 'Cụm từ' : 'Từ'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={reset}>Hủy</Button>
              <Button className="flex-1" onClick={handleImport} disabled={bulkCreate.isPending}>
                {bulkCreate.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang import...</> : `Import ${preview.length} mục`}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) parseFile(f) }}
              onClick={() => fileRef.current?.click()}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors',
                dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              )}
            >
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">Kéo thả file vào đây hoặc bấm để chọn</p>
                <p className="text-sm text-muted-foreground mt-1">Hỗ trợ .xlsx và .json</p>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f) }} />
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={downloadTemplate}>
                <Download className="h-4 w-4" />Tải file mẫu
              </Button>
              <div className="flex gap-1 ml-auto">
                <span className="flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300">
                  <FileSpreadsheet className="h-3 w-3" />.xlsx
                </span>
                <span className="flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                  <FileJson className="h-3 w-3" />.json
                </span>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
              <p className="font-medium">Cấu trúc file:</p>
              <p className="text-muted-foreground">Excel: cột <code className="rounded bg-muted px-1">word</code>, <code className="rounded bg-muted px-1">meaning</code>, <code className="rounded bg-muted px-1">example</code> (tùy chọn), <code className="rounded bg-muted px-1">category</code> (tùy chọn), <code className="rounded bg-muted px-1">type</code> (<code className="rounded bg-muted px-1">word</code> hoặc <code className="rounded bg-muted px-1">phrase</code>)</p>
              <p className="text-muted-foreground">JSON: mảng object với các trường tương tự</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
