import "./Card.css";
export default function StockCard() {
  return (
    <div className="card">
      <h3>📈 股票追蹤</h3>

      <table>
        <tbody>
          <tr>
            <td>0050</td>
            <td>218.60</td>
            <td style={{ color: "green" }}>+1.25%</td>
          </tr>

          <tr>
            <td>4916</td>
            <td>115.50</td>
            <td style={{ color: "red" }}>-0.82%</td>
          </tr>

          <tr>
            <td>00992A</td>
            <td>16.75</td>
            <td style={{ color: "green" }}>+0.15%</td>
          </tr>

          <tr>
            <td>2886</td>
            <td>31.80</td>
            <td style={{ color: "green" }}>+0.44%</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}