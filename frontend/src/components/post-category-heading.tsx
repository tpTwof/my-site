/** 当前分类的汇总，数量来自标签接口，不受文章分页或侧栏搜索影响。 */
export function PostCategoryHeading({ name, count }: { name: string; count: number | null }) {
  return (
    <header className="mb-8 flex flex-wrap items-baseline gap-x-4 gap-y-2 border-b border-border pb-5" aria-live="polite">
      <h1 className="text-2xl font-medium tracking-tight text-foreground">{name}</h1>
      <span className="text-sm text-muted-foreground">{count === null ? '加载中…' : `${count} 篇文章`}</span>
    </header>
  )
}
