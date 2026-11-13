# Mantenimiento del perfil

Este repositorio mantiene el perfil de Carlos-Coronel. Funciona de forma independiente de los proyectos enlazados y no usa servicios externos de tarjetas, fuentes o estadísticas.

## Archivos

| Archivo | Función |
| --- | --- |
| `README.md` | Texto, proyectos, enlaces y seis paneles desplegables nativos. |
| `assets/accent.svg` | Única imagen: una decoración animada sin texto ni controles. |
| `profile.config.json` | Usuario cuya actividad pública se consulta. |
| `scripts/update-profile.mjs` | Consulta GitHub, actualiza el bloque de actividad y genera la decoración. |
| `scripts/update-profile.test.mjs` | Comprueba la actualización, el manejo de errores y el contenido nativo. |
| `.github/workflows/update-profile.yml` | Ejecuta las comprobaciones y la actualización automática. |
| `docs/MANTENIMIENTO.md` | Esta guía. |

## Editar el perfil

Edita `README.md` para cambiar textos, proyectos, tecnologías o enlaces. El contenido fuera de `<!-- PROFILE:START -->` y `<!-- PROFILE:END -->` se conserva al actualizar. Mantén esos dos marcadores una sola vez y en ese orden.

Los títulos y acciones son texto seleccionable. Los controles `<details>` y `<summary>` se pueden abrir con ratón o teclado. GitHub proporciona la tipografía, los colores y la adaptación al tema claro u oscuro. La decoración respeta la preferencia de reducir movimiento; para modificarla, edita `accentSvg()` en el actualizador.

## Actualización automática

**Actualizar perfil** consulta únicamente la API oficial de GitHub cada seis horas: a las 00:20, 06:20, 12:20 y 18:20 UTC. También puede iniciarse en **Actions → Actualizar perfil → Run workflow**. GitHub puede retrasar las ejecuciones; los datos no son en tiempo real.

La automatización consulta repositorios públicos, estrellas, seguidores y los tres proyectos propios con pushes más recientes, excluyendo este perfil. No muestra nombres de repositorios privados. Si la consulta falla, conserva los datos publicados. Usa acciones oficiales y el token temporal del repositorio; no requiere tokens personales ni instalar paquetes.

Para comprobarlo localmente, con Node.js 24:

```sh
node --test scripts/update-profile.test.mjs
node scripts/update-profile.mjs
```

En repositorios públicos, GitHub puede desactivar la programación tras 60 días sin actividad. Si ocurre, vuelve a habilitar el flujo en Actions.
