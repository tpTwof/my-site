/** 联系页：使用已有公开主页提供联系入口，不接入后端或提交表单。 */
export default function Contact() {
  return (
    <section className="py-10 sm:py-16">
      <p className="mb-3 text-xs tracking-[0.25em] text-muted-foreground">联系</p>
      <h1 className="text-4xl font-black tracking-tight sm:text-5xl">CONTACT</h1>
      <p className="mt-6 max-w-md text-sm leading-7 text-muted-foreground">
        如果你想聊聊项目或交流想法，可以在 GitHub 找到我。
      </p>
      <a
        href="https://github.com/tpTwof"
        target="_blank"
        rel="noreferrer"
        className="mt-6 inline-block text-sm underline underline-offset-4 transition-colors hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      >
        GitHub / tpTwof
      </a>
    </section>
  )
}
