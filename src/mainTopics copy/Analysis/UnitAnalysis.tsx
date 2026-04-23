
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const data = [
  { name: 'North Region', value: 400 },
  { name: 'South Region', value: 300 },
  { name: 'East Region', value: 200 },
  { name: 'West Region', value: 100 },
];

const COLORS = ['#47b728ff', '#00C49F', '#FFBB28', '#d0632dff'];

const UnitAnalysis = () => {
  return (
    <div style={{ textAlign: 'center' }}>
      <h2>Unit Analysis - Region Wise</h2>
      <PieChart width={900} height={300}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          outerRadius={100}
          label
          dataKey="value"
        >
          {data.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </div>
  );
};

export default UnitAnalysis;
