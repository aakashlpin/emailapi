import Head from 'next/head'
import styles from '../styles/Home.module.css'

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>EmailAPI OSS</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to OSS <a href="https://emailapi.io">EmailAPI!</a>
        </h1>

        <p className={styles.description}>
          Get started by visiting{' '}
          <code className={styles.code}>emailapi.io</code>
        </p>
      </main>
    </div>
  )
}
