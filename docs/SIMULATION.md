# Simulation guide

Simulation starts automatically and does not require hardware or downloaded model weights. The random generator is seeded with 42. Motion follows bounded elliptical paths with object-specific speed. Bounding boxes and rendered objects use the same generated scene state.

| Scenario | Behavior |
|---|---|
| Normal monitoring | 12 objects and periodic controlled occlusion |
| Multiple moving objects | 22 objects with varied phases/classes |
| Sensor failure | IR disappears after second 8 of each 30-second cycle and returns at the next cycle |
| Persistent unknown | Extra Unknown objects trigger persistent-classification alerts |
| Multi-sensor detection | Each object is observed by a camera and radar for association |
| High-density environment | 70 moving objects; stresses simple nearest-neighbor association |

Use the top controls to choose a scenario/speed and press Start. Pause stops simulated movement. Reset preserves persisted history but creates a new track namespace. Scenario changes reset the scene. Speed controls motion time, not wall-clock alert time or network update frequency.

The synthetic IR feed is grayscale with increased contrast; it is not a radiometric thermal model. Low light is an illustrative exposure effect. Generated FPS and latency describe the demo presentation, not actual camera hardware. Radar/LiDAR/GPS/IMU cards in simulation are placeholders for sensor modalities, not physical sensor emulators with validated noise models.

The first new database receives twenty seconds of backdated synthetic observations for immediate history and chart activity. Those records retain SIMULATED provenance. Existing databases are not re-seeded with duplicate historical tracks.

A fixed occlusion of one object between simulation seconds 15 and 19 exercises loss/reacquisition. At 5× speed that wall-clock gap may be too short to exceed the tracker loss threshold; use 1× for lifecycle demonstrations.
