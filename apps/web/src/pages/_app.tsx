import type { AppProps } from 'next/app'
import Head from 'next/head'
import '../styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#dc2626" />
        <link rel="manifest" href="/manifest.json" />
        <title>Kasir Bakso & Es Teh</title>
      </Head>
      <Component {...pageProps} />
    </>
  )
}
