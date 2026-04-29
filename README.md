# Eufy S1 Vacuum Card

A Home Assistant Lovelace dashboard card built for Eufy S1 robot vacuums.

The card gives you a compact vacuum tile with:

- Eufy S1 product image by default
- Fan speed dropdown
- Optional room dropdown
- Battery and cleaning metrics
- Main toolbar buttons for clean, pause, stop, locate, and dock
- Frosted settings popup for Eufy S1 select/switch/button entities
- Optional map camera drawer or side panel
- Visual editor support for the visible card controls

This project is a fork of `denysdovhan/vacuum-card` with Eufy S1-specific defaults and a redesigned compact dashboard layout.

## Installation

### HACS

1. Open HACS in Home Assistant.
2. Go to `Integrations` or `Frontend`, then open the three-dot menu.
3. Choose `Custom repositories`.
4. Add this repository:

   ```text
   https://github.com/AnielGammaTech/eufy-s1-vacuum-card
   ```

5. Set the category to `Dashboard`.
6. Install `Eufy S1 Vacuum Card`.
7. Restart Home Assistant or hard refresh your browser if Home Assistant asks.

HACS should add the dashboard resource automatically. If you need to add it manually, use:

```text
/hacsfiles/eufy-s1-vacuum-card/vacuum-card.js
```

Resource type:

```text
JavaScript module
```

### Manual

1. Download `vacuum-card.js` from the latest release.
2. Copy it to your Home Assistant `config/www` folder.
3. Add this dashboard resource:

   ```yaml
   url: /local/vacuum-card.js
   type: module
   ```

## Basic Usage

Add the card from the visual editor, or use YAML:

```yaml
type: custom:eufy-s1-vacuum-card
entity: vacuum.eufy_s1
battery_entity: sensor.eufy_s1_battery
```

The card auto-detects common Eufy S1 entities from the vacuum entity slug. For example, if your vacuum is `vacuum.eufy_s1`, it will look for entities such as:

```text
select.eufy_s1_clean_room
sensor.eufy_s1_cleaning_area
sensor.eufy_s1_cleaning_time
select.eufy_s1_suction_level
switch.eufy_s1_auto_empty
switch.eufy_s1_auto_wash
```

If your entities use different names, edit them from the visual editor or YAML.

## Example Config

```yaml
type: custom:eufy-s1-vacuum-card
entity: vacuum.eufy_s1
battery_entity: sensor.eufy_s1_battery
card_width: 260px
show_name: true
show_status: true
show_toolbar: true
show_header_stats: true
show_header_selects: true
```

## Map Support

The card can show a map only if your Home Assistant setup exposes a `camera.*` or `image.*` entity for the vacuum map.

```yaml
type: custom:eufy-s1-vacuum-card
entity: vacuum.eufy_s1
battery_entity: sensor.eufy_s1_battery
map: camera.eufy_s1_map
map_mode: drawer
```

Available map modes:

| Mode      | Behavior                                      |
| --------- | --------------------------------------------- |
| `drawer`  | Opens the map below the vacuum image.         |
| `side`    | Shows the map beside the card on wider cards. |
| `replace` | Replaces the vacuum image with the map.       |
| `hidden`  | Disables map display.                         |

For side mode, use a wider card:

```yaml
card_width: 560px
map_mode: side
```

## Visual Editor

The visual editor supports the most common dashboard changes:

- Main vacuum entity
- Battery entity
- Optional map entity
- Card width
- Header dropdowns
- Header metric chips
- Main toolbar buttons
- Visibility toggles

The settings popup still has sensible Eufy S1 defaults. Advanced users can customize it in YAML with the `settings` option.

## Header Dropdowns

Header dropdowns are compact `select.*` controls shown beside fan speed. A common Eufy S1 example is room selection:

```yaml
header_selects:
  - entity_id: select.eufy_s1_clean_room
    name: Room
    icon: mdi:door-open
```

## Header Metrics

Header metrics are small chips under the top controls:

```yaml
header_stats:
  - entity_id: sensor.eufy_s1_cleaning_area
    subtitle: Area
    icon: mdi:floor-plan
    unit: m²
  - entity_id: sensor.eufy_s1_cleaning_time
    subtitle: Time
    icon: mdi:timer-outline
    value_template: "{{ (value | float(0) / 60) | round(0) }}"
    unit: min
```

## Main Buttons

The visible toolbar can be customized from the visual editor or YAML:

```yaml
toolbar_buttons:
  - name: Pause
    icon: mdi:pause
    action: pause
    states:
      - cleaning
  - name: Stop
    icon: mdi:stop
    action: stop
    states:
      - cleaning
  - name: Dock
    icon: mdi:home-import-outline
    action: return_to_base
    states:
      - cleaning
      - paused
      - idle
```

Built-in actions:

```text
start
pause
stop
return_to_base
locate
resume
```

## Settings Popup

The settings popup is opened from the tune icon in the card header. It supports Home Assistant entities such as:

- `select.*`
- `switch.*`
- `button.*`
- `number.*`
- `time.*`
- `sensor.*`

Example:

```yaml
settings:
  - type: section
    label: Cleaning
  - entity: select.eufy_s1_suction_level
    name: Suction
  - entity: select.eufy_s1_cleaning_mode
    name: Mode
  - entity: select.eufy_s1_clean_room
    name: Room
  - type: section
    label: Dock
  - entity: switch.eufy_s1_auto_empty
    name: Auto Empty
  - entity: switch.eufy_s1_auto_wash
    name: Auto Wash
  - entity: button.eufy_s1_empty_dust_bin
    name: Empty Bin
```

## Options

| Name                  | Type      | Default       | Description                                      |
| --------------------- | --------- | ------------- | ------------------------------------------------ |
| `type`                | `string`  | Required      | `custom:eufy-s1-vacuum-card`                     |
| `entity`              | `string`  | Required      | Vacuum entity.                                   |
| `battery_entity`      | `string`  | Optional      | Battery sensor entity.                           |
| `map`                 | `string`  | Optional      | Camera or image entity for map display.          |
| `map_mode`            | `string`  | `drawer`      | `drawer`, `side`, `replace`, or `hidden`.        |
| `map_refresh`         | `number`  | `5`           | Map refresh interval in seconds.                 |
| `image`               | `string`  | `eufy-s1`     | `eufy-s1`, `default`, or a custom image URL.     |
| `card_width`          | `string`  | `260px`       | CSS width for the card.                          |
| `show_name`           | `boolean` | `true`        | Show vacuum friendly name.                       |
| `show_status`         | `boolean` | `true`        | Show vacuum state/status.                        |
| `show_toolbar`        | `boolean` | `true`        | Show main buttons.                               |
| `show_map_toggle`     | `boolean` | `true`        | Show map button when a map entity exists.        |
| `show_header_selects` | `boolean` | `true`        | Show header dropdown controls.                   |
| `show_header_stats`   | `boolean` | `true`        | Show header metric chips.                        |
| `compact_view`        | `boolean` | `false`       | Hide the image/map area.                         |
| `header_selects`      | `array`   | Auto-detected | Header `select.*` controls.                      |
| `header_stats`        | `array`   | Auto-detected | Header metric chips.                             |
| `toolbar_buttons`     | `array`   | Built in      | Main toolbar buttons.                            |
| `settings`            | `array`   | Auto-detected | Settings popup rows.                             |
| `actions`             | `object`  | Optional      | Override built-in vacuum actions.                |
| `shortcuts`           | `array`   | Optional      | Extra shortcut buttons for idle/docked state.    |

## Theming

The card exposes CSS variables:

| Variable                    | Description             |
| --------------------------- | ----------------------- |
| `--vc-background`           | Card background.        |
| `--vc-primary-text-color`   | Primary text color.     |
| `--vc-secondary-text-color` | Secondary text color.   |
| `--vc-icon-color`           | Icon color.             |
| `--vc-toolbar-background`   | Toolbar background.     |
| `--vc-toolbar-text-color`   | Toolbar text color.     |
| `--vc-toolbar-icon-color`   | Toolbar icon color.     |
| `--vc-divider-color`        | Divider color.          |
| `--vc-spacing`              | Internal spacing.       |

## Credits

Based on the MIT-licensed [`denysdovhan/vacuum-card`](https://github.com/denysdovhan/vacuum-card).

## License

MIT
