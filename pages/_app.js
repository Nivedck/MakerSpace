import Head from 'next/head';
import '../public/styles.css';

export default function App({ Component, pageProps }){
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#0a3d62" />
        <title>Makerspace Access</title>
        <link rel="icon" type="image/png" href="/favicon.png" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
