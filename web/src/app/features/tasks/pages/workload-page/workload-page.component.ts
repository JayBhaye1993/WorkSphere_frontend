import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideRefreshCw, LucideClock, LucideAlertTriangle, LucideCheckCircle, LucideSparkles } from '@lucide/angular';

// Workload data is hardcoded until the workload API is built (Module 2)
const PEOPLE: Record<string, { name: string; role: string; color: string }> = {
  MI: { name: 'Maya Iqbal',    role: 'Team Lead',       color: '#4f46e5' },
  TR: { name: 'Theo Rivera',   role: 'Backend Eng',     color: '#2563eb' },
  SK: { name: 'Sana Kapoor',   role: 'Product Designer',color: '#0d9488' },
  DL: { name: 'Diego Luna',    role: 'Frontend Eng',    color: '#d97706' },
  AO: { name: 'Amara Okafor',  role: 'QA Engineer',     color: '#e11d48' },
  JC: { name: 'Jonah Chen',    role: 'Backend Eng',     color: '#7c3aed' },
  RB: { name: 'Ravi Banerjee', role: 'Platform Eng',    color: '#16a34a' },
};

const WORKLOAD_DATA = [
  { key:'MI', hours:[6,7,8,7,5] },
  { key:'TR', hours:[8,9,9,8,7] },
  { key:'SK', hours:[5,4,3,6,5] },
  { key:'DL', hours:[7,8,7,6,7] },
  { key:'AO', hours:[4,5,6,5,4] },
  { key:'JC', hours:[9,10,10,9,8] },
  { key:'RB', hours:[6,7,6,5,6] },
];

const DAYS = ['Mon Jun 2','Tue Jun 3','Wed Jun 4','Thu Jun 5','Fri Jun 6'];
const CAPACITY = 40;

@Component({
  selector: 'ws-workload-page',
  standalone: true,
  imports: [CommonModule, LucideRefreshCw, LucideClock, LucideAlertTriangle, LucideCheckCircle, LucideSparkles],
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <div class="title-row"><h1 class="title">Team Workload</h1><span class="pill">This sprint</span></div>
          <p class="subtitle">Capacity vs. allocation across 7 members · week of Jun 2 – Jun 6</p>
        </div>
        <div class="actions">
          <button class="btn-ghost"><svg lucideRefreshCw [size]="14"></svg> Rebalance</button>
          <button class="btn-primary"><svg lucideSparkles [size]="14"></svg> Assign work</button>
        </div>
      </div>
      <div class="card">
        <div class="card-head">
          <div><div class="card-title">Allocation heatmap</div><div class="card-sub">Daily booked hours · 8h baseline</div></div>
          <div class="legend">
            <span class="legend-label">0h</span>
            @for (c of legendColors; track c) { <span class="legend-swatch" [style.background]="c"></span> }
            <span class="legend-label">10h+</span>
          </div>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr>
              <th class="th-member">Member</th>
              @for (d of days; track d) { <th class="th-day">{{ d }}</th> }
              <th class="th-week">Week</th>
            </tr></thead>
            <tbody>
              @for (row of rows; track row.key) {
                <tr>
                  <td class="td-member">
                    <span class="avatar" [style.background]="row.color">{{ row.key }}</span>
                    <div><div class="member-name">{{ row.name }}</div><div class="member-role">{{ row.role }}</div></div>
                  </td>
                  @for (h of row.hours; track $index) {
                    <td class="td-day">
                      <div class="heat-cell" [style.background]="heatBg(h)" [style.color]="heatText(h)">
                        <span class="mono">{{ h }}h</span>
                      </div>
                    </td>
                  }
                  <td class="td-week">
                    <div class="week-total mono">{{ row.total }}h</div>
                    <div class="week-pct" [style.color]="pctColor(row.total)">{{ pct(row.total) }}%</div>
                    <div class="week-bar"><div class="week-fill" [style.width.%]="Math.min(100,pct(row.total))" [style.background]="pctColor(row.total)"></div></div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
      <div class="stats">
        <div class="stat-card">
          <div class="stat-head"><svg lucideClock [size]="16" class="stat-icon"></svg><span>Team utilization</span></div>
          <div class="stat-value">{{ utilization }}%</div>
        </div>
        <div class="stat-card">
          <div class="stat-head"><svg lucideAlertTriangle [size]="16" class="stat-icon red"></svg><span>Overloaded</span></div>
          <div class="stat-value red">{{ overloaded }}</div><div class="stat-suffix">members</div>
        </div>
        <div class="stat-card">
          <div class="stat-head"><svg lucideCheckCircle [size]="16" class="stat-icon green"></svg><span>Free capacity</span></div>
          <div class="stat-value green">{{ freeCapacity }}h</div>
        </div>
        <div class="stat-card">
          <div class="stat-head"><svg lucideSparkles [size]="16" class="stat-icon indigo"></svg><span>AI rebalance</span></div>
          <div class="stat-value indigo">Move 2 tasks</div><div class="stat-suffix">JC → AO frees 9h</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page{padding:22px;display:flex;flex-direction:column;gap:20px;height:100%;overflow-y:auto;}
    .page-head{display:flex;justify-content:space-between;align-items:flex-start;}
    .title-row{display:flex;align-items:center;gap:10px;margin-bottom:4px;}
    .title{font-size:19px;font-weight:700;color:#0f172a;letter-spacing:-.02em;margin:0;}
    .pill{font-size:11px;font-weight:600;color:#4338ca;background:#eef2ff;padding:2px 10px;border-radius:999px;}
    .subtitle{font-size:12.5px;color:#64748b;margin:0;}
    .actions{display:flex;gap:8px;}
    .btn-ghost{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 14px;border-radius:8px;border:1.5px solid #e2e8f0;background:white;color:#475569;font-size:12.5px;font-weight:600;cursor:pointer;}
    .btn-primary{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 14px;border-radius:8px;border:none;background:#4f46e5;color:white;font-size:12.5px;font-weight:600;cursor:pointer;}
    .card{background:white;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;}
    .card-head{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #f1f5f9;}
    .card-title{font-size:14px;font-weight:600;color:#1e293b;}.card-sub{font-size:12px;color:#64748b;}
    .legend{display:flex;align-items:center;gap:4px;}.legend-label{font-size:11px;color:#64748b;}.legend-swatch{width:20px;height:14px;border-radius:3px;}
    .table-wrap{overflow-x:auto;}.table{width:100%;border-collapse:collapse;min-width:700px;}
    th{padding:10px 12px;font-size:11.5px;font-weight:600;color:#64748b;text-align:left;border-bottom:1px solid #f1f5f9;white-space:nowrap;}
    .th-member{width:170px;}.th-day{width:85px;text-align:center;}.th-week{width:100px;}
    tr:hover td{background:#fafbff;}
    .td-member{padding:10px 12px;display:flex;align-items:center;gap:10px;}
    .avatar{width:32px;height:32px;border-radius:50%;color:white;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
    .member-name{font-size:13px;font-weight:600;color:#1e293b;}.member-role{font-size:11px;color:#64748b;}
    .td-day{padding:6px 8px;text-align:center;}
    .heat-cell{height:42px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;cursor:default;}
    .heat-cell:hover{outline:2px solid #0f172a;}
    .td-week{padding:10px 12px;}
    .week-total{font-size:13px;font-weight:700;color:#1e293b;}.week-pct{font-size:11px;font-weight:600;margin:2px 0;}
    .week-bar{height:4px;background:#e2e8f0;border-radius:999px;overflow:hidden;margin-top:4px;}.week-fill{height:100%;border-radius:999px;}
    .stats{display:flex;gap:12px;flex-wrap:wrap;}
    .stat-card{flex:1;min-width:150px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;}
    .stat-head{display:flex;align-items:center;gap:7px;font-size:12px;color:#64748b;margin-bottom:8px;}
    .stat-icon{color:#64748b;}.stat-icon.red{color:#dc2626;}.stat-icon.green{color:#16a34a;}.stat-icon.indigo{color:#4f46e5;}
    .stat-value{font-size:22px;font-weight:700;color:#0f172a;}
    .stat-value.red{color:#dc2626;}.stat-value.green{color:#16a34a;}.stat-value.indigo{color:#4f46e5;font-size:16px;}
    .stat-suffix{font-size:12px;color:#64748b;margin-top:2px;}
  `]
})
export class WorkloadPageComponent {
  readonly days = DAYS;
  readonly legendColors = ['#f1f5f9','#dcfce7','#bbf7d0','#fef08a','#fdba74','#f87171'];
  readonly Math = Math;
  readonly rows = WORKLOAD_DATA.map(d => ({
    ...d, ...PEOPLE[d.key], color: PEOPLE[d.key].color,
    total: d.hours.reduce((a: number, b: number) => a + b, 0)
  }));
  get totalBooked(): number { return this.rows.reduce((a: number, r: any) => a + r.total, 0); }
  get utilization(): number { return Math.round(this.totalBooked/(7*CAPACITY)*100); }
  get overloaded(): number  { return this.rows.filter((r: any) => r.total > 36).length; }
  get freeCapacity(): number { return 7*CAPACITY - this.totalBooked; }
  pct(t: number): number { return Math.round((t/CAPACITY)*100); }
  pctColor(t: number): string { const p=this.pct(t); if(p>100) return '#dc2626'; if(p>90) return '#ea580c'; if(p>70) return '#4f46e5'; return '#16a34a'; }
  heatBg(h: number): string { if(h<=2) return '#f1f5f9'; if(h<=4) return '#dcfce7'; if(h<=6) return '#bbf7d0'; if(h<=8) return '#fef08a'; if(h<=9) return '#fdba74'; return '#f87171'; }
  heatText(h: number): string { if(h<=6) return '#15803d'; if(h<=8) return '#a16207'; if(h<=9) return '#9a3412'; return '#7f1d1d'; }
}
