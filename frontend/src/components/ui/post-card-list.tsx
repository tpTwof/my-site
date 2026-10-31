import { Link } from 'react-router-dom'
import { cn, formatCardDate } from '@/lib/utils'
import type { PostSummary } from '@/types/post'

interface PostCardListProps {
  posts: PostSummary[]
  className?: string
}

/**
 * 经典博客风格的文章列表。
 *
 * 样式取自参考站（Jekyll 主题），颜色经 `--post-*` CSS 变量中转：
 * 亮色模式下与参考站完全一致，暗色模式只改 `index.css` 里的变量值。
 *
 * 悬停：左侧红色竖条从透明显形（15px），同时文字区右移 30px。
 * 过渡为 `linear` 匀速，与参考站一致。
 */
export function PostCardList({ posts, className }: PostCardListProps) {
  return (
    <ul className={cn('m-0 list-none p-0', className)}>
      {posts.map((post) => (
        <li
          key={post.id}
          className={cn(
            // 参考站写法：静止时完全不声明 border-left，悬停时才给
            // 15px solid。浏览器会在 border-width 0→15px 与颜色
            // transparent→红 之间同时插值，红条是「长出来」的。
            'mb-8 list-none',
            'mx-[2em] transition-all duration-300 ease-linear',
            'hover:border-l-[15px] hover:border-l-[var(--post-accent)] hover:pl-[30px]',
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
            {formatCardDate(post.created_at)}
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