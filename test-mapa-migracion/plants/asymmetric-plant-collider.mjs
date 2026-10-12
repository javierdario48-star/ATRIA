/**
 * ATRIA — planta de suelo con colisión asimétrica posterior.
 * Núcleo experimental independiente. No modifica runtime ni mapa clínico.
 * Coordenadas: píxeles originales 1024 x 1536; Y aumenta hacia abajo.
 */
export function blockedByPlant(plant, footX, footY) {
  const c = plant.collision_mask_base;
  const [x,y] = c.pot_center_world_px, [rx,ry]=c.pot_radius_world_px;
  const behind=footY<y;
  const centerY=behind?y-c.rear_lift_px:y;
  const radiusY=ry+c.character_radius_px+(behind?c.rear_extra_y_px:(c.front_extra_y_px||0));
  const radiusX=rx+c.side_extra_x_px;
  return ((footX-x)/radiusX)**2+((footY-centerY)/radiusY)**2<1;
}
export function behindFoliage(plant,footX,footY){
  const [x0,y0,w,h] = plant.source_bbox;
  return footY<plant.depth_anchor_world_px[1] &&
    footX>=x0-9 && footX<=x0+w+9 &&
    footY>=y0-5 && footY-41<=y0+h;
}
/**
 * Follaje no tiene colisión. Renderizar sobre el avatar SOLO la máscara alfa
 * de follaje al pasar por detrás, no una máscara elíptica de fondo.
 * Independientemente de la oclusión, la imagen BG_SRC original permanece fija.
 */
