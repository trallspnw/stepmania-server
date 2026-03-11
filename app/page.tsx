import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>stepmania-server</p>
          <h1>Song queue management starts here.</h1>
          <p>
            This Next.js app is the base for a StepMania song queue service. The
            next implementation steps are Docker Compose, Postgres, song
            directory ingestion, and porting the starter UI from{" "}
            <code>docs/v0-design/</code>.
          </p>
        </div>
        <div className={styles.ctas}>
          <span className={styles.primary}>Next.js 16 scaffold</span>
          <span className={styles.secondary}>
            App Router + TypeScript + ESLint
          </span>
        </div>
      </main>
    </div>
  );
}
