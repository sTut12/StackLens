export interface AnalysisResult {
  url: string
  domain: string
  scrape_method: string
  stack: Record<string, string>
  structure: string[]
  ui_components: string[]
  explanation: string
  skeleton: {
    folder_structure: string
    components: Record<string, string>
    framework: string
    extension: string
    install_command: string
  }
  performance?: {
    load_time_ms: number
    page_size_kb: number
    status_code: number
    https: boolean
    speed_rating: string
  }
  from_cache: boolean
  ollama_used: boolean
  response_time_ms: number
}

export interface HistoryItem {
  url: string
  summary: string
  timestamp: number
}
