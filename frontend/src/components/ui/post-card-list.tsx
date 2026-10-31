import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { PostSummary } from '@/types/post'

interface PostCardListProps {
  posts: PostSummary[]
  /** 日期格式化函数，默认为英文短日期（02 Oct 2026） */
  formatDate?: (iso: string) => string
  className?: string
}

/** 02 Oct 2026 —— 参考站的 date_to_string 格式 */
export function formatCardDate(iso: string): string {
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, '0')
  const month = d.toLocaleDateString('en-GB', { month: 'short' })
  return `${day} ${month} ${d.getFullYear()}`
}

/**
 * 经典博客风格的文章列表。
 *
 * 样式取自参考站（Jekyll 主题），颜色经 `--post-*` CSS 变量中转：
 * 亮色模式下与参考站完全一致，暗色模式只改 `index.css` 里的变量值。
 *
 * 悬停：左侧红色竖条从透明显形（15px），同时文字区右移 30px。
 * 参考站用的是 `linear` 匀速过渡，显得生硬，这里改为 `ease-out`。
 */
export function PostCardList({ posts, formatDate = formatCardDate, className }: PostCardListProps) {
  return (
    <ul className={cn('m-0 list-none p-0', className)}>
      {posts.map((post) => (
        <li
          key={post.id}
          className={cn(
            'mb-8 list-none border-l-[15px] border-l-transparent',
            'mx-[2em] transition-all duration-300 ease-out',
            'hover:border-l-[var(--post-accent)] hover:pl-[30px]',
          )}
        >
          <h2 className="m-0 mb-6 text-[26px] leading-[48px] font-bold">
            <Link
              to={`/posts/${post.slug}`}
              className={cn(
                'no-underline visited:text-[var(--post-link)]',
                'text-[var(--post-link)] hover:text-[var(--post-link-hover)] hover:underline',
              )}
            >
              {post.title}
            </Link>
          </h2>

          <span className="my-2 block text-[var(--post-muted)]">
            {formatDate(post.created_at)}
          </span>

          <hr className="my-3 border-t border-[var(--post-rule)]" />

          <p className="text-base leading-normal text-[var(--post-body)]">{post.summary}</p>

          <p className="mt-2">
            <Link
              to={`/posts/${post.slug}`}
              className={cn(
                'no-underline visited:text-[var(--post-link)]',
                'text-[var(--post-link)] hover:text-[var(--post-link-hover)] hover:underline',
              )}
            >
              阅读全文 »
            </Link>
          </p>

          <hr className="my-3 border-t border-[var(--post-rule)]" />
        </li>
      ))}
    </ul>
  )
}