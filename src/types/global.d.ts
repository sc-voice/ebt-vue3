declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '*.mjs' {
  const content: any
  export default content
}

declare module '*.cjs' {
  const content: any
  export default content
}

declare module '*.json' {
  const content: any
  export default content
}

// Global variables
declare const xit: any
