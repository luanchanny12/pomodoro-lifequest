import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from './api'

function downloadBlob(url: string, defaultFilename: string) {
  return api.get(url, { responseType: 'blob' }).then((response) => {
    const disposition = response.headers['content-disposition']
    let filename = defaultFilename
    if (disposition) {
      const match = disposition.match(/filename="?(.+?)"?$/)
      if (match) filename = match[1]
    }
    const blobUrl = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = blobUrl
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(blobUrl)
  })
}

export function useExportExcel() {
  return useMutation({
    mutationFn: () => downloadBlob('/exports/excel', 'life-quest-data.xlsx'),
    onSuccess: () => toast.success('Xuất Excel thành công!'),
    onError: () => toast.error('Xuất Excel thất bại'),
  })
}

export function useExportPdf() {
  return useMutation({
    mutationFn: () => downloadBlob('/exports/pdf', 'life-quest-report.pdf'),
    onSuccess: () => toast.success('Xuất PDF thành công!'),
    onError: () => toast.error('Xuất PDF thất bại'),
  })
}

export function useExportCsv() {
  return useMutation({
    mutationFn: (tableName: string) =>
      downloadBlob(`/exports/csv/${tableName}`, `${tableName}.csv`),
    onSuccess: () => toast.success('Xuất CSV thành công!'),
    onError: () => toast.error('Xuất CSV thất bại'),
  })
}
