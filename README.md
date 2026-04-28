# Lista Aula

Aplicacion web mobile-first para tomar asistencia escolar en 20-30 segundos por curso, con Firebase como backend y un modo demo local para validar el flujo sin configurar credenciales todavia.

## Stack

- React + Vite
- React Router
- Firebase Firestore
- CSS custom con foco mobile-first

## Estructura

```text
.
|- src/
|  |- components/        UI reutilizable
|  |- lib/               Firebase, config y storage local
|  |- mocks/             Modo demo local
|  |- pages/             Dashboard, asistencia e historial
|  |- services/          Firestore y capa de acceso a datos
|  |- utils/             Fechas y helpers de asistencia
|  |- App.jsx
|  |- main.jsx
|  `- styles.css
|- firestore.rules
|- firestore.indexes.json
`- .env.example
```

## Configuracion

1. Instala dependencias:

```bash
npm install
```

2. Crea tu archivo `.env` a partir de `.env.example`.

3. Completa las credenciales de Firebase.

4. Inicia la app:

```bash
npm run dev
```

Si no hay credenciales configuradas, la app usa datos demo y guarda asistencias en `localStorage`.

## Carga inicial de colegios, cursos y estudiantes

El proyecto incluye un seed reutilizable en [scripts/data/schools.seed.mjs](</c:/Users/Compumax/OneDrive/Escritorio/Lista-Estudiante/scripts/data/schools.seed.mjs:1>) y [scripts/seed-school-data.mjs](</c:/Users/Compumax/OneDrive/Escritorio/Lista-Estudiante/scripts/seed-school-data.mjs:1>).

Para importar datos a Firestore:

```bash
npm run seed:schools
```

El seed hace `upsert` por nombre de escuela, combinacion `schoolId + course.name` y `courseId + student.fullName`, para evitar duplicados si lo corres mas de una vez.

Nota:
El frontend no implementa autenticacion todavia. Si tu proyecto Firestore no esta en modo prueba, vas a necesitar habilitar Auth o ajustar tus reglas antes de usar la app contra produccion.

## Firebase

### Colecciones base

- `schools`
- `courses`
- `students`
- `attendance`

### Modelo recomendado

```js
// courses/{courseId}
{
  schoolId: "school-1",
  name: "3 B",
  shift: "manana",
  createdAt: Timestamp
}

// students/{studentId}
{
  courseId: "course-1",
  fullName: "Perez, Ana",
  isActive: true,
  createdAt: Timestamp
}

// attendance/{attendanceId}
{
  courseId: "course-1",
  date: "2026-04-28",
  createdAt: Timestamp,
  updatedAt: Timestamp,
  students: {
    studentId1: "present",
    studentId2: "absent"
  }
}
```

## Flujo completo

1. Dashboard: se listan cursos y el ultimo curso usado queda destacado.
2. Abrir curso: la pantalla carga alumnos y busca la asistencia del dia.
3. Estado inicial: todos arrancan como `present`.
4. Tocar fila: alterna instantaneamente a `absent` o `present`.
5. Guardar: primero se valida si ya existe asistencia para `courseId + date`; si existe se edita, si no existe se crea.
6. Feedback: aparece confirmacion visual con hora de guardado.
7. Historial: lista de fechas por curso con acceso directo a editar.

## Funciones implementadas

- `getCourses`
- `getCourseById`
- `getStudentsByCourse`
- `getAttendanceByCourseAndDate`
- `createAttendance`
- `updateAttendance`
- `getAttendanceHistory`
- `getAttendanceByDate`
- `getAttendanceByDateRange`

## Buenas practicas de performance y costo

- Consulta por `courseId + date`: evita generar duplicados incluso si ya habia registros con IDs aleatorios.
- Orden en cliente para `courses` y `students`: menos indices compuestos y menos mantenimiento.
- Borrador local: si el docente pierde foco o cierra la app, los cambios no se pierden antes de guardar.
- Historial paginable: el servicio ya acepta `limit`, asi que escalar a mas fechas no cambia la UX principal.

## Nota de producto

La autenticacion no esta incluida para no desviar el foco del flujo de aula. Si luego quieres cerrar el acceso por docente, el siguiente paso natural es agregar Firebase Auth y filtrar `courses` por usuario autenticado.
