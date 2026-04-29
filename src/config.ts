import localize from './localize';
import { VacuumCardConfig, VacuumCardSetting } from './types';

function getVacuumSlug(entityId: string): string {
  return entityId.split('.')[1] ?? '';
}

function getDefaultSettings(entityId: string): VacuumCardSetting[] {
  const slug = getVacuumSlug(entityId);

  if (!slug) {
    return [];
  }

  return [
    { type: 'section', label: 'Cleaning' },
    { entity: `select.${slug}_suction_level`, name: 'Suction' },
    { entity: `select.${slug}_cleaning_mode`, name: 'Mode' },
    { entity: `select.${slug}_cleaning_intensity`, name: 'Intensity' },
    { entity: `select.${slug}_mop_intensity`, name: 'Mop' },
    { entity: `select.${slug}_water_level`, name: 'Water' },
    { entity: `select.${slug}_clean_room`, name: 'Room' },
    { type: 'section', label: 'Dock' },
    { entity: `switch.${slug}_auto_empty`, name: 'Auto Empty' },
    { entity: `select.${slug}_auto_empty_mode`, name: 'Empty Mode' },
    { entity: `switch.${slug}_auto_wash`, name: 'Auto Wash' },
    { entity: `select.${slug}_wash_frequency_mode`, name: 'Wash Mode' },
    { entity: `number.${slug}_wash_frequency_value_time`, name: 'Wash Every' },
    { entity: `button.${slug}_wash_mop`, name: 'Wash Mop' },
    { entity: `button.${slug}_dry_mop`, name: 'Dry Mop' },
    { entity: `button.${slug}_empty_dust_bin`, name: 'Empty Bin' },
    { type: 'section', label: 'Quiet Hours' },
    { entity: `switch.${slug}_do_not_disturb`, name: 'Do Not Disturb' },
    { entity: `time.${slug}_do_not_disturb_start`, name: 'Start' },
    { entity: `time.${slug}_do_not_disturb_end`, name: 'End' },
    { type: 'section', label: 'Maintenance' },
    { entity: `sensor.${slug}_filter_remaining`, name: 'Filter' },
    { entity: `sensor.${slug}_side_brush_remaining`, name: 'Side Brush' },
    { entity: `sensor.${slug}_rolling_brush_remaining`, name: 'Rolling Brush' },
    { entity: `sensor.${slug}_mopping_cloth_remaining`, name: 'Mop Cloth' },
    { entity: `sensor.${slug}_sensor_remaining`, name: 'Sensors' },
    { entity: `sensor.${slug}_cleaning_tray_remaining`, name: 'Tray' },
  ];
}

export default function buildConfig(
  config?: Partial<VacuumCardConfig>,
): VacuumCardConfig {
  if (!config) {
    throw new Error(localize('error.invalid_config'));
  }

  if (!config.entity) {
    throw new Error(localize('error.missing_entity'));
  }

  const actions = config.actions;
  if (actions && Array.isArray(actions)) {
    console.warn(localize('warning.actions_array'));
  }

  return {
    entity: config.entity,
    battery_entity: config.battery_entity ?? '',
    map: config.map ?? '',
    map_mode: config.map_mode ?? 'drawer',
    map_refresh: config.map_refresh ?? 5,
    image: config.image ?? 'yamilka',
    card_width: config.card_width ?? '260px',
    show_name: config.show_name ?? true,
    show_status: config.show_status ?? true,
    show_toolbar: config.show_toolbar ?? true,
    show_map_toggle: config.show_map_toggle ?? true,
    show_header_stats: config.show_header_stats ?? true,
    compact_view: config.compact_view ?? false,
    header_stats: config.header_stats ?? [],
    stats: config.stats ?? {},
    actions: config.actions ?? {},
    shortcuts: config.shortcuts ?? [],
    settings: config.settings ?? getDefaultSettings(config.entity),
  };
}
