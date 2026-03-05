/**
 * Helpers to derive grade from class name (e.g. "5EF" -> "Grade 5").
 */

function getGradeFromClass(className) {
    if (!className) return null;
    if (className.startsWith('Grade ')) return className;
    const match = className.match(/^(\d)/);
    return match ? `Grade ${match[1]}` : null;
}

function isClassInGrade(className, grade) {
    return getGradeFromClass(className) === grade;
}

export { getGradeFromClass, isClassInGrade };
