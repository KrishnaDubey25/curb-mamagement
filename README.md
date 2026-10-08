# SmartCurb AI v6

Updated user-only prototype with:

- premium login and landing page
- nearby curb discovery
- interactive Connaught Road 3D road map
- priority-based curb booking
- **booking history page**
- **realistic CCTV / plate-scan visual concept** inside the 3D scene

## Main user flow

1. Login
2. Detect location or use demo location
3. Explore nearby curbs
4. Open Connaught Road 3D map
5. Request a curb space using priority rules
6. View assigned curb on the map
7. Simulate arrival / exit
8. Open **Booking History** to review past and current reservations

## CCTV / scanning note

The 3D map includes CCTV poles and plate-scan overlays to show the concept of continuous roadside scanning.
This is a **visual simulation only**.
There is **no real live CCTV feed or ANPR model** in this version.

## Run

```bash
npm install
npm run dev
```

Then open the local URL shown in terminal.

## Important limitations

- road geometry is illustrative, not surveyed
- route directions open OpenStreetMap using a preset demo route
- curb availability is simulated
- booking history is stored in browser localStorage
- plate recognition is conceptual visualisation only
