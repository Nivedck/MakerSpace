import Link from 'next/link';

const roles = [
  { key: 'student', title: 'Student' },
  { key: 'staff', title: 'Staff'  },
  { key: 'guest', title: 'Guest' },
  { key: 'execom', title: 'Execom' },
];

export default function CheckinRole() {
  return (
    <main className="screen">
      <div className="stack">
        <div>
          <div className="title">Who is checking in?</div>
          <div className="subtitle">Select your category to continue</div>
        </div>

        <div className="card stack">
          {roles.map((role) => (
            <Link
              key={role.key}
              href={`/checkin?role=${role.key}`}
              className="btn btn-primary"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontWeight: 700 }}>{role.title}</span>
                <span style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 }}>
                  {role.detail}
                </span>
              </div>
            </Link>
          ))}

          <Link href="/" className="btn btn-outline">Back</Link>
        </div>
      </div>
    </main>
  );
}
