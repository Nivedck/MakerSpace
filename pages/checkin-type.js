import Link from 'next/link';

export default function CheckinType() {
  return (
    <main className="screen">
      <div className="stack">
        <div>
          <div className="title">Select User Type</div>
          <div className="subtitle">Are you a student or staff member?</div>
        </div>
        <div className="card stack">
          <Link href="/form?type=student" className="btn btn-primary">
            👨‍🎓 Student
          </Link>
          <Link href="/form?type=staff" className="btn btn-secondary">
            👨‍🏫 Staff
          </Link>
        </div>
        <Link href="/" className="btn btn-outline">Back</Link>
      </div>
    </main>
  );
}
