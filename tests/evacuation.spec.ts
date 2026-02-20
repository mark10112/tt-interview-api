import { test, expect } from '@playwright/test';

test.describe('Evacuation API E2E', () => {

  test.beforeAll(async ({ request }) => {
    // Clear all data before running tests
    const response = await request.delete('/api/evacuations/clear');
    expect(response.status()).toBe(204);
  });

  test('should execute the full evacuation planning flow', async ({ request }) => {
    
    // 1. Add Zone 1 (High Urgency)
    const zone1Res = await request.post('/api/evacuation-zones', {
      data: {
        ZoneID: 'Z1',
        LocationCoordinates: { latitude: 13.7563, longitude: 100.5018 },
        NumberOfPeople: 100,
        UrgencyLevel: 4
      }
    });
    expect(zone1Res.status()).toBe(201);

    // 2. Add Zone 2 (Critical Urgency)
    const zone2Res = await request.post('/api/evacuation-zones', {
      data: {
        ZoneID: 'Z2',
        LocationCoordinates: { latitude: 13.7367, longitude: 100.5231 },
        NumberOfPeople: 50,
        UrgencyLevel: 5
      }
    });
    expect(zone2Res.status()).toBe(201);

    // 3. Add Vehicle 1 (Bus)
    const vehicle1Res = await request.post('/api/vehicles', {
      data: {
        VehicleID: 'V1',
        Capacity: 40,
        Type: 'bus',
        LocationCoordinates: { latitude: 13.7650, longitude: 100.5381 },
        Speed: 60
      }
    });
    expect(vehicle1Res.status()).toBe(201);

    // 4. Add Vehicle 2 (Van)
    const vehicle2Res = await request.post('/api/vehicles', {
      data: {
        VehicleID: 'V2',
        Capacity: 20,
        Type: 'van',
        LocationCoordinates: { latitude: 13.7320, longitude: 100.5200 },
        Speed: 50
      }
    });
    expect(vehicle2Res.status()).toBe(201);

    // 5. Generate Plan
    const planRes = await request.post('/api/evacuations/plan');
    expect(planRes.status()).toBe(200);
    const plan = await planRes.json();
    
    // Validate the plan structure and logic
    expect(plan.length).toBeGreaterThan(0);
    
    // Z2 is urgency 5, should be handled first. It has 50 people.
    // Closest/Best vehicle for Z2 will be selected.
    const z2Assignments = plan.filter((a: any) => a.ZoneID === 'Z2');
    expect(z2Assignments.length).toBeGreaterThan(0);

    // 6. Check Initial Status
    let statusRes = await request.get('/api/evacuations/status');
    let statuses = await statusRes.json();
    expect(statuses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ZoneID: 'Z1', RemainingPeople: 100, TotalEvacuated: 0 }),
        expect.objectContaining({ ZoneID: 'Z2', RemainingPeople: 50, TotalEvacuated: 0 })
      ])
    );

    // 7. Update Status (simulate van arriving and taking 20 people from Z2)
    const updateZ2Res = await request.put('/api/evacuations/update', {
      data: {
        ZoneID: 'Z2',
        VehicleID: 'V2',
        EvacueesMoved: 20
      }
    });
    expect(updateZ2Res.status()).toBe(200);

    // 8. Update Status (simulate bus taking 40 people from Z1)
    const updateZ1Res = await request.put('/api/evacuations/update', {
      data: {
        ZoneID: 'Z1',
        VehicleID: 'V1',
        EvacueesMoved: 40
      }
    });
    expect(updateZ1Res.status()).toBe(200);

    // 9. Verify Final Statuses
    statusRes = await request.get('/api/evacuations/status');
    statuses = await statusRes.json();
    
    const z1Status = statuses.find((s: any) => s.ZoneID === 'Z1');
    const z2Status = statuses.find((s: any) => s.ZoneID === 'Z2');

    expect(z1Status.TotalEvacuated).toBe(40);
    expect(z1Status.RemainingPeople).toBe(60);

    expect(z2Status.TotalEvacuated).toBe(20);
    expect(z2Status.RemainingPeople).toBe(30);
  });

  test('should return 400 for invalid validation schemas', async ({ request }) => {
    // Missing required fields
    const res = await request.post('/api/evacuation-zones', {
      data: {
        ZoneID: 'Z_INVALID'
        // Missing Location, NumberOfPeople, Urgency
      }
    });
    
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation Error');
  });
});
