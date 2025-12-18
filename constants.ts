import { GradeBookState } from "./types";

export const DEFAULT_QUESTION = `כתבו תוכנית הקולטת מספר מהמשתמש ובודקת אם הוא מספר זוגי בטווח של 1-1000 (כולל). אם המספר לא נמצא בטווח, או שאינו זוגיֿ, יש לבקש מהמשתמש להזין מספר אחר, עד שיוזן מספר שעומד בדרישות.`;

export const DEFAULT_SOLUTION = `/*********************************
Class: MAGSHIMIM C1 *
Week 6 *
Input validation *
**********************************/
#include <stdlib.h>
#include <stdio.h>
/**
The program gets the user's choice of an even number between 1 - 1000.
Input:
None
Output:
The program returns 0 upon successful completion of its running (windows convention)
*/
int main(void)
{
// Variable declaration
const unsigned int MIN = 1;
const unsigned int MAX = 1000;
int num = 0;
unsigned int isValid = 0;

// Get user input and check if it is valid.
// Since we get the input at least once, we use a DO-WHILE loop
do
{
	printf("Enter a number between %d - %d: ", MIN, MAX);		// Get user input
	scanf("%d", &num);

	isValid = (num >= MIN && num <= MAX && num % 2 ==0);
	if (!isValid)									// Check if the number is valid
	{
		printf("Invalid number!\n");
	}
}
while (!isValid);									// Repeat until num is valid

printf("Your number is: %d\\n", num);
	
return 0;
}`;

export const DEFAULT_RUBRIC = `הנחיית הערכה מקצועית ושיטתית לקוד סטודנטים
מבנה המשימה והקלט:
קלט ראשוני: תסופק סדרה של שלושה רכיבים:
א. השאלה: תיאור המשימה המקורית שניתנה לסטודנטים.
ב. הפתרון המקורי (Master Solution): תכנית קוד מלאה ונכונה המהווה את פתרון הבסיס לתרגיל.
ג. פתרונות סטודנטים: קודים שונים שהוגשו להערכה.
פלט נדרש: עבור כל פתרון סטודנט, יש לספק שני אלמנטים במבנה הבא:
א. ציון: יש לכתוב את הציון המספרי שנקבע מעל הפסקה, בפורמט: [X]/10-10/10 (כאשר X הוא הציון).
ב. משוב ממוקד: פסקה אחת של משוב מקצועי ומקיף.
קריטריוני הניתוח והערכה (Grade Rubric)
בדיקה פונקציונלית (Functional Check)
• עמידה בדרישות המשתנים: האם הקוד כולל הגדרה של משתנה שלם (int) ומשתנה עשרוני (float).
• הקצאת ערכים: האם בוצעה הקצאה או אתחול (Assignment) של ערכים למשתנים שהוגדרו.
• ביצוע והדפסה:
o האם בוצעה הדפסה של המשתנים, בצירוף הודעה מלווה ברורה.
o האם בוצע חישוב והדפסה של מכפלת המשתנים.
• אימות חישוב: בדיקה ואישור שהחישוב מתבצע באמצעות המשתנים שהוגדרו (ולא באמצעות ערכים קשיחים - Hard-Coded Values).
• התאמת הפלט: בדיקה שהפורמט והתוכן של הפלט תואמים במדויק להוראות השאלה.
בדיקת תקינות סינטקס וריצה (Syntax & Execution)
• תקינות הקוד: הקוד נקי משגיאות קומפילציה.
• שימוש נכון בפונקציות: שימוש נכון בפקודות הדפסה (printf) והתאמה של מפרטי הפורמט (Format Specifiers) לסוגי המשתנים המודפסים (%d, %f וכו').
• יציבות: הקוד רץ בפועל עד סופו ללא קריסות (Run-time errors).
קריטריוני איכות וקריאות קוד (Code Quality & Readability)
• שמות משתנים: שימוש בשמות משתנים קריאים, משמעותיים והגיוניים בהקשר הלימודי (יש להימנע משמות מוזרים או לא מקצועיים).
• מבנה לוגי: שמירה על מבנה קוד סדור ועקבי: הגדרת משתנים ← חישובים ← הדפסות ← סיום תוכנית עם return 0.
• תיעוד (הערות):
o חובה לכלול הערות קוד.
o בדיקה שההערות מוסיפות ערך והבנה לקוד, ואינן מיותרות או חסרות היגיון.
בדיקת מקוריות (Originality Check)
• הערכה: הערכה האם הקוד נכתב על ידי הסטודנט או עשוי להיות מועתק ממקור חיצוני / בינה מלאכותית, תוך התייחסות לאינדיקציות כגון:
o הערות בשפה פורמלית יתר על המידה או לא טבעית.
o דפוסי שמות משתנים אחידים בצורה חשודה.
o שימוש בפונקציות, ספריות או פורמטים לא צפויים ביחס לרמת השאלה.
o מבנה קוד מורכב או מתוחכם שאינו הולם את רמת המשימה.
תהליך הניקוד והמשוב
ניקוד: הציון הסופי יינתן מ-0 עד 10, תוך שקלול של כלל הקריטריונים, כאשר הפונקציונליות ועמידה בדרישות השאלה מקבלות את המשקל הגבוה ביותר. מקוריות (חשד להעתקה/AI) יכולה להשפיע לרעה על הציון.
כתיבת המשוב:
• פורמט: המשוב ייכתב כפסקה אחת, שלמה, ישירה וברורה.
• פנייה: הפנייה היא ישירות לסטודנט, מנוסחת בטון מקצועי ומכבד (כך שניתן יהיה להעתיק ולהשתמש בה).
• תוכן: המשוב אינו חוזר על דברים ואינו מפרט יתר על המידה – הוא מסביר באופן ממוקד מה בוצע היטב ומה נדרש לתיקון או שיפור.
• הערות מינוריות: אם קיימות הערות קלות ומינוריות בלבד (כגון פקודת getchar() מיותרת), הן יצוינו במשוב, אך לא יגרמו להורדת נקודות.`;

export const DEFAULT_STUDENT_CODE = `#include <stdio.h>

#define MAX_NUM 1000
#define MIN_NUM 1

int main(void)
{
	int num = 0;
	
	do
	{
		printf("Please enter a num between 1-1000: ");
		if (scanf("%d", &num) != 1) //checking if the num is really a num and not a char
		{
			printf("Invalid input!\\n");
			while ((getchar()) != '\\n'); //clearing the buffer
			continue; //restarting loop
		}
	
		if (num % 2 == 0 && (num >= MIN_NUM && num <= MAX_NUM)) //making sure number is even and between 1-1000
		{
			printf("Valid number\\n");
			return 0;
		}
		else
		{
			printf("Invalid number!\\n"); //if it isn't 
		}
	} while (1);
	/*
	get num-
	check if even-
	check if its from 1-1000-
	if not (either) loop-
	if yes (both) end-
	*/
	return 0;
}`;

export const DEFAULT_CUSTOM_INSTRUCTIONS = `חל איסור על שימוש בפקודות הבאות בעקבות שאיננו למדנו אותן: "break", "continue"`;

export const AGENT_SYSTEM_PROMPT_TEMPLATE = `[INSTRUCTIONS FOR AI AGENT]

You are a professional AI agent for evaluating student code submissions.
You will receive the question in Hebrew, along with the master solution, rubric, and student code.
Your task is to return a **score (0-10) and feedback in Hebrew** that is professional, clear, and concise.

The system will provide the following data:

1. Question (in Hebrew):
{QUESTION_TEXT}

2. Master Solution:
{MASTER_SOLUTION}

3. Rubric:
{RUBRIC}

4. Student Code:
{STUDENT_CODE}

---

[REFERENCE EXAMPLES]
Use the following examples as a gold standard for the tone, style, and level of detail required in the feedback. Note how they explain the *why* behind errors without just giving the answer.

Example 1:
Score: 8
Feedback: שאלה 5, ראשית, יש שימוש ב־break בתוך לולאת הבדיקה, מה שאסור לשימוש כי איננו למדנו זאת. שנית, הלולאה הפנימית בודקת את כל המספרים עד num-1, מה שגורם לחוסר יעילות גדול במיוחד עבור מספרים גדולים; פתרון אופטימלי היה לבדוק עד num/2 או עד השורש הריבועי של num.

Example 2:
Score: 8
Feedback: שאלה 1, אתה מדפיס את הודעת ההצלחה ("is a even number!!!") בתוך הלולאה (בבלוק ה-else), וזה לא נכון פלט סופי ומאושר צריך להופיע רק אחרי שהלולאה נגמרת ואתה בטוח שהקלט תקין. בנוסף, אין לבקש קליטה נוספת מהמשתמש כאשר scanf לא מצליחה לקלוט. הרי שהמערכת לא מצליחה וקיים צורך לסגור את התכנית. וכן לוודא שהלולאה מטפלת גם בקלט שאינו מספרי. עליך לתקן את הלוגיקה הפנימית ואת מיקום הפלט כדי שהאימות יעבוד כמו שצריך.

Example 3:
Score: 8
Feedback: שאלה 1, אתה מבצע קריאת קלט (scanf) פעמיים באותה איטרציה של הלולאה! אם הקלט שגוי, אתה קורא מספר חדש אבל לא בודק אותו, ובמקום זאת חוזר לבדוק את המספר הראשון והשגוי. עליך למחוק את הבלוק if שמכיל את הבקשה והקריאה החוזרת, ולתת ללולאה לחזור על עצמה באופן אוטומטי אם התנאי ב-while לא מתקיים. בנוסף, חסר לך פלט סופי של המספר המאושר, ומומלץ להשתמש בקבועים לגבולות הטווח.

---

[TASK]

1. Functional Checks:
    - Check if int and float variables are defined according to the rubric.
    - Check if values are assigned to variables.
    - Check if variables are printed with clear messages.
    - Ensure calculations are performed using the variables and not hard-coded values.
    - Ensure output format matches the question requirements.

2. Syntax & Execution Checks:
    - Verify code compiles without errors.
    - Verify printf/print statements match variable types.
    - Ensure the code runs without runtime crashes.

3. Code Quality & Readability:
    - Meaningful and readable variable names.
    - Logical code structure: variable definitions → calculations → prints → return 0.
    - Useful and clear comments.

4. Originality Check:
    - Detect potential plagiarism or AI-generated code.
    - Flag suspiciously formal comments or unusual naming patterns.
    - Identify unnecessarily complex structures for the expected skill level.

---

[STRICT CONSTRAINTS]
- Do NOT use the characters "-" (hyphen) or "–" (dash) anywhere in the feedback. Use other separators like colons, periods, or new lines.

[OUTPUT FORMAT]
Return **JSON only** in the exact format below:

{
  "score": X,           # 0-10
  "feedback": "..."     # One professional paragraph in Hebrew explaining strengths and areas for improvement
}

---

build:

[EDITABLE SECTION FOR AGENT PROMPT ADJUSTMENTS]
This section can be edited in the future to add instructions or modify agent behavior:
{AGENT_CUSTOM_INSTRUCTIONS}

---

[NOTES]
- Keep a professional and respectful tone.
- Do not number items or repeat points in the feedback.
- Feedback should be ready to copy-paste directly to the student.
- Do not include internal reasoning, calculations, or step-by-step analysis.
- Even though instructions are in English, ensure that the final feedback is fully in Hebrew.
`;

// Initial state with 13 students and 1 exercise
export const INITIAL_GRADEBOOK_STATE: GradeBookState = {
  students: Array.from({ length: 13 }, (_, i) => ({ 
    id: `student-${i + 1}`, 
    name: `Student ${i + 1}` 
  })),
  exercises: [
    {
      id: 'ex-1',
      name: 'Exercise 1',
      maxScore: 10,
      entries: {}
    }
  ]
};