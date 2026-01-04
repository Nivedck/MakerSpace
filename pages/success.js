import Link from 'next/link';

export default function Success(){
  return (
    <main className="screen">
      <div className="card stack" style={{alignItems:'center',textAlign:'center'}}>
        <div style={{
          width:64,height:64,borderRadius:'50%',background:'var(--accent)',display:'grid',placeItems:'center'
        }}>
          <span style={{fontSize:'1.8rem',color:'#fff'}}>✓</span>
        </div>
        <div className="title">Success</div>
        <div className="subtitle">Your entry was recorded</div>
        <Link href='/' className="btn btn-secondary" style={{maxWidth:240}}>Back to home</Link>
      </div>
    </main>
  );
}
