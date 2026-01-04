import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const PURPOSES = [ 'Work', 'Project', 'Maintenance', 'Visit' ];
const BRANCHES = ['IT', 'CS', 'CE', 'ME', 'EC', 'EE', 'CB', 'AI'];

export default function FormPage() {
  const router = useRouter();
  const { type } = router.query;
  const [form, setForm] = useState({ 
    name:'', 
    reg_no:'', 
    phone:'',
    department:'', 
    year:'', 
    purpose: PURPOSES[0] 
  });
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (type && type !== 'student' && type !== 'staff') {
      router.push('/checkin-type');
    }
  }, [type, router]);

  function onChange(e) {
    let value = e.target.value;
    
    // Auto-format reg_no to uppercase
    if (e.target.name === 'reg_no') {
      value = value.toUpperCase().replace(/\s+/g, '');
    }
    
    // Remove spaces from phone
    if (e.target.name === 'phone') {
      value = value.replace(/\s+/g, '');
    }
    
    setForm({...form,[e.target.name]:value});
    setErr(null);
  }

  function validate() {
    if (!form.name.trim()) return 'Name is required';
    
    if (type === 'student') {
      const regNoRegex = /^KSD(2[0-9])(IT|CS|CE|ME|EC|EE|CB|AI)\d{3}$/;
      if (!regNoRegex.test(form.reg_no)) {
        return 'Invalid registration number format (e.g., KSD24IT051)';
      }
    } else {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(form.phone)) {
        return 'Invalid phone number (10 digits required)';
      }
    }
    
    if (!form.purpose) return 'Purpose is required';
    return null;
  }

  function submit(e) {
    e.preventDefault();
    const error = validate();
    if (error) {
      setErr(error);
      return;
    }
    
    sessionStorage.setItem('ms_form', JSON.stringify({...form, user_type: type}));
    router.push('/capture');
  }

  if (!type) return null;

  return (
    <main className="screen">
      <div>
        <div className="title">{type === 'student' ? 'Student' : 'Staff'} Check-In</div>
        <div className="subtitle">Fill in your details</div>
      </div>
      <form className="card stack" onSubmit={submit}>
        <div className="field">
          <label className="label">Name</label>
          <input 
            className="input" 
            name="name" 
            value={form.name} 
            onChange={onChange} 
            required 
            placeholder="Full Name"
          />
        </div>
        
        {type === 'student' ? (
          <>
            <div className="field">
              <label className="label">Registration Number</label>
              <input 
                className="input" 
                name="reg_no" 
                value={form.reg_no} 
                onChange={onChange} 
                required 
                placeholder="e.g., KSD24IT051"
                maxLength={12}
              />
              <small className="muted">Format: KSD + Year + Branch + Roll</small>
            </div>
            <div className="grid2">
              <div className="field">
                <label className="label">Department</label>
                <select className="select" name="department" value={form.department} onChange={onChange}>
                  <option value="">Select</option>
                  {BRANCHES.map(b=> <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label">Year</label>
                <select className="select" name="year" value={form.year} onChange={onChange}>
                  <option value="">Select</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>
            </div>
          </>
        ) : (
          <div className="field">
            <label className="label">Phone Number</label>
            <input 
              className="input" 
              name="phone" 
              type="tel"
              value={form.phone} 
              onChange={onChange} 
              required 
              placeholder="10-digit mobile number"
              maxLength={10}
            />
          </div>
        )}
        
        <div className="field">
          <label className="label">Purpose of Visit</label>
          <select className="select" name="purpose" value={form.purpose} onChange={onChange}>
            {PURPOSES.map(p=> <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        
        {err && <div className="error">{err}</div>}
        
        <div className="footer-actions">
          <button type="submit" className="btn btn-primary">Continue to Photo</button>
          <Link href="/checkin-type" className="btn btn-outline">Back</Link>
        </div>
      </form>
    </main>
  );
}
