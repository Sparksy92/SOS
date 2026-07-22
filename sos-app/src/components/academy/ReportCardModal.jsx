import React from 'react';
import { Award, ShieldCheck, Printer, X, CheckCircle, FileText } from 'lucide-react';

export default function ReportCardModal({ studentName = "Homestead Learner", records = [], onClose }) {
  const handlePrint = () => {
    window.print();
  };

  const totalCompleted = records.length;
  const avgScore = records.length > 0 
    ? Math.round(records.reduce((acc, r) => acc + (r.scorePercentage || 0), 0) / records.length) 
    : 0;

  return (
    <div className="report-card-modal-backdrop" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px'
    }}>
      <div className="report-card-paper" style={{
        background: '#1E293B', color: '#F8FAFC', width: '100%', maxWidth: '750px',
        maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px',
        border: '1px solid rgba(74, 107, 75, 0.4)', padding: '32px', position: 'relative'
      }}>
        {/* Action Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Award size={28} color="#10B981" />
            <h2 style={{ margin: 0, fontSize: '1.4rem', letterSpacing: '0.5px', color: '#6EE7B7' }}>
              OFFICIAL HOMESCHOOL TRANSCRIPT & COMPLIANCE REPORT
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={handlePrint} 
              style={{
                background: '#10B981', color: '#0F172A', border: 'none', padding: '8px 16px',
                borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <Printer size={16} /> Print / Export PDF
            </button>
            <button 
              onClick={onClose} 
              style={{ background: 'transparent', border: '1px solid #475569', color: '#94A3B8', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Official Seal Banner */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(74, 107, 75, 0.3)',
          padding: '16px 20px', borderRadius: '8px', marginBottom: '24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#94A3B8', textTransform: 'uppercase' }}>Student Transcript Record</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#F8FAFC' }}>{studentName}</div>
            <div style={{ fontSize: '0.85rem', color: '#10B981' }}>Verified US (NGSS/CCSS) & Canadian Provincial Standards Alignment</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Overall Mastery Score</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: avgScore >= 80 ? '#10B981' : '#F59E0B' }}>
              {avgScore}%
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{totalCompleted} Course(s) Completed</div>
          </div>
        </div>

        {/* Course Performance Table */}
        <h3 style={{ fontSize: '1rem', color: '#CBD5E1', marginBottom: '12px' }}>Course Completion Ledger</h3>
        {records.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', background: '#0F172A', borderRadius: '8px' }}>
            No courses completed yet. Complete quizzes and evaluation modules to populate this official report card.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: '#0F172A', color: '#94A3B8', textAlign: 'left', borderBottom: '1px solid #334155' }}>
                <th style={{ padding: '10px' }}>Course / Module</th>
                <th style={{ padding: '10px' }}>Subject</th>
                <th style={{ padding: '10px' }}>Standards Mapped</th>
                <th style={{ padding: '10px' }}>Score</th>
                <th style={{ padding: '10px' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '10px', fontWeight: 600, color: '#F8FAFC' }}>{r.courseTitle}</td>
                  <td style={{ padding: '10px', color: '#94A3B8' }}>{r.subject || 'Practical Science'}</td>
                  <td style={{ padding: '10px', color: '#60A5FA', fontSize: '0.75rem' }}>
                    {Array.isArray(r.standards) ? r.standards.join(', ') : 'US.NGSS / CA.ON'}
                  </td>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: r.scorePercentage >= 80 ? '#10B981' : '#F59E0B' }}>
                    {r.scorePercentage}%
                  </td>
                  <td style={{ padding: '10px', color: '#94A3B8', fontSize: '0.8rem' }}>
                    {r.completedAt ? new Date(r.completedAt).toLocaleDateString() : 'Recorded'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Verification Footer */}
        <div style={{
          borderTop: '1px solid #334155', paddingTop: '16px', display: 'flex',
          justify: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#94A3B8'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={16} color="#10B981" />
            <span>SOS Survival Academy Turnkey Educational Provider Verification</span>
          </div>
          <div>Audit Code: SOS-EDU-2026-USCA</div>
        </div>
      </div>
    </div>
  );
}
