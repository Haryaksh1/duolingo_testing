"""Seed course content: Spanish for English speakers.

Each skill lists vocabulary (spanish, english, emoji) and sentences (spanish, english).
English entries may hold alternatives separated by '|'; the first is the canonical one.
seed.py turns these into concrete exercises stored in the database.
"""

COURSE = {"language": "es", "title": "Spanish", "flag": "/es.svg"}

UNITS = [
    {
        "title": "Unit 1",
        "description": "Greet people, order food and talk about people",
        "color": "green",
        "skills": [
            {
                "title": "Greetings",
                "icon": "👋",
                "vocab": [
                    ("hola", "hello|hi", "👋"),
                    ("adiós", "goodbye|bye", "🚪"),
                    ("gracias", "thank you|thanks", "🙏"),
                    ("por favor", "please", "🥺"),
                    ("buenos días", "good morning", "🌅"),
                    ("sí", "yes", "✅"),
                ],
                "sentences": [
                    ("Hola, ¿cómo estás?", "Hello, how are you?|Hi, how are you?"),
                    ("Buenos días, señor", "Good morning, sir"),
                    ("Gracias, adiós", "Thank you, goodbye|Thanks, goodbye|Thanks, bye"),
                    ("Sí, por favor", "Yes, please"),
                ],
            },
            {
                "title": "Food",
                "icon": "☕",
                "vocab": [
                    ("el café", "the coffee", "☕"),
                    ("el agua", "the water", "💧"),
                    ("el pan", "the bread", "🍞"),
                    ("la manzana", "the apple", "🍎"),
                    ("la leche", "the milk", "🥛"),
                    ("el queso", "the cheese", "🧀"),
                ],
                "sentences": [
                    ("Yo bebo agua", "I drink water|I am drinking water"),
                    ("Ella come pan", "She eats bread|She is eating bread"),
                    ("Quiero un café", "I want a coffee|I want coffee"),
                    ("La manzana es roja", "The apple is red"),
                ],
            },
            {
                "title": "People",
                "icon": "🧑",
                "vocab": [
                    ("el hombre", "the man", "👨"),
                    ("la mujer", "the woman", "👩"),
                    ("el niño", "the boy", "👦"),
                    ("la niña", "the girl", "👧"),
                    ("el gato", "the cat", "🐱"),
                    ("el perro", "the dog", "🐶"),
                ],
                "sentences": [
                    ("El niño tiene un perro", "The boy has a dog"),
                    ("La mujer es alta", "The woman is tall"),
                    ("Yo soy un hombre", "I am a man"),
                    ("El gato bebe leche", "The cat drinks milk|The cat is drinking milk"),
                ],
            },
        ],
    },
    {
        "title": "Unit 2",
        "description": "Get around town and talk about places",
        "color": "blue",
        "skills": [
            {
                "title": "Places",
                "icon": "🏙️",
                "vocab": [
                    ("la casa", "the house", "🏠"),
                    ("la escuela", "the school", "🏫"),
                    ("el hotel", "the hotel", "🏨"),
                    ("la playa", "the beach", "🏖️"),
                    ("el museo", "the museum", "🏛️"),
                    ("la ciudad", "the city", "🌆"),
                ],
                "sentences": [
                    ("¿Dónde está el hotel?", "Where is the hotel?"),
                    ("Vamos a la playa", "We are going to the beach|Let's go to the beach|We go to the beach"),
                    ("La escuela es grande", "The school is big|The school is large"),
                    ("Mi casa es pequeña", "My house is small"),
                ],
            },
            {
                "title": "Transport",
                "icon": "🚆",
                "vocab": [
                    ("el tren", "the train", "🚆"),
                    ("el coche", "the car", "🚗"),
                    ("el avión", "the plane|the airplane", "✈️"),
                    ("el autobús", "the bus", "🚌"),
                    ("la bicicleta", "the bicycle|the bike", "🚲"),
                    ("el barco", "the boat|the ship", "⛵"),
                ],
                "sentences": [
                    ("El tren es rápido", "The train is fast"),
                    ("Yo tomo el autobús", "I take the bus"),
                    ("El avión sale hoy", "The plane leaves today|The airplane leaves today"),
                    ("Ella tiene un coche rojo", "She has a red car"),
                ],
            },
            {
                "title": "Directions",
                "icon": "🧭",
                "vocab": [
                    ("izquierda", "left", "⬅️"),
                    ("derecha", "right", "➡️"),
                    ("cerca", "near|close", "📍"),
                    ("lejos", "far", "🗺️"),
                    ("aquí", "here", "👇"),
                    ("allí", "there", "👉"),
                ],
                "sentences": [
                    ("El museo está cerca", "The museum is near|The museum is close|The museum is nearby"),
                    ("Gira a la derecha", "Turn right|Turn to the right"),
                    ("La playa está lejos", "The beach is far|The beach is far away"),
                    ("El baño está aquí", "The bathroom is here"),
                ],
            },
        ],
    },
    {
        "title": "Unit 3",
        "description": "Talk about family, time and daily routines",
        "color": "purple",
        "skills": [
            {
                "title": "Family",
                "icon": "👪",
                "vocab": [
                    ("la madre", "the mother|the mom", "👩"),
                    ("el padre", "the father|the dad", "👨"),
                    ("el hermano", "the brother", "👦"),
                    ("la hermana", "the sister", "👧"),
                    ("la abuela", "the grandmother|the grandma", "👵"),
                    ("el abuelo", "the grandfather|the grandpa", "👴"),
                ],
                "sentences": [
                    ("Mi madre cocina", "My mother cooks|My mom cooks|My mother is cooking"),
                    ("Tengo dos hermanos", "I have two brothers|I have two siblings"),
                    ("Mi abuelo es viejo", "My grandfather is old|My grandpa is old"),
                    ("Ella es mi hermana", "She is my sister"),
                ],
            },
            {
                "title": "Time",
                "icon": "⏰",
                "vocab": [
                    ("hoy", "today", "📅"),
                    ("mañana", "tomorrow", "🌄"),
                    ("ayer", "yesterday", "⏪"),
                    ("la noche", "the night", "🌙"),
                    ("el día", "the day", "☀️"),
                    ("la hora", "the hour|the time", "⏰"),
                ],
                "sentences": [
                    ("Hoy es lunes", "Today is Monday"),
                    ("Mañana voy al museo", "Tomorrow I go to the museum|Tomorrow I am going to the museum|I am going to the museum tomorrow"),
                    ("Buenas noches", "Good night|Good evening"),
                    ("¿Qué hora es?", "What time is it?"),
                ],
            },
            {
                "title": "Routine",
                "icon": "🪥",
                "vocab": [
                    ("dormir", "to sleep", "😴"),
                    ("comer", "to eat", "🍽️"),
                    ("trabajar", "to work", "💼"),
                    ("leer", "to read", "📖"),
                    ("correr", "to run", "🏃"),
                    ("escribir", "to write", "✍️"),
                ],
                "sentences": [
                    ("Yo leo un libro", "I read a book|I am reading a book"),
                    ("Ella trabaja mucho", "She works a lot|She works hard"),
                    ("Nosotros comemos juntos", "We eat together|We are eating together"),
                    ("Él corre en la playa", "He runs on the beach|He is running on the beach"),
                ],
            },
        ],
    },
]

ACHIEVEMENTS = [
    ("first_lesson", "First Steps", "Complete your first lesson", "🎯", "lessons", 1, 10),
    ("scholar", "Scholar", "Complete 5 lessons", "📚", "lessons", 5, 25),
    ("sage", "Sage", "Complete 15 lessons", "🦉", "lessons", 15, 100),
    ("xp_100", "XP Rookie", "Earn 100 XP", "⚡", "xp", 100, 20),
    ("xp_500", "XP Olympian", "Earn 500 XP", "🏆", "xp", 500, 100),
    ("streak_3", "On Fire", "Reach a 3 day streak", "🔥", "streak", 3, 20),
    ("streak_7", "Week Warrior", "Reach a 7 day streak", "📆", "streak", 7, 50),
    ("perfect_1", "Flawless", "Finish a lesson with no mistakes", "💎", "perfect", 1, 15),
    ("perfect_5", "Perfectionist", "Finish 5 lessons with no mistakes", "👑", "perfect", 5, 50),
]

BOTS = [
    ("maya", "Maya", "/girl.svg"),
    ("leo", "Leo", "/boy.svg"),
    ("priya", "Priya", "/woman.svg"),
    ("kenji", "Kenji", "/man.svg"),
    ("sofia", "Sofía", "/girl.svg"),
    ("omar", "Omar", "/man.svg"),
    ("zoe", "Zoe", "/woman.svg"),
    ("robo", "RoboLingo", "/robot.svg"),
    ("zed", "Zed", "/zombie.svg"),
]
