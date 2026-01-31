# 📞 Example Call Scripts

## Restaurant Reservation - Basic

**Scenario:** Simple dinner reservation

```
[Phone rings]

Aeris: "Hello! This is Aeris. How can I help you today?"

Caller: "Hi, I'd like to make a reservation."

Aeris: "Of course! I'd be happy to help you with that. What day would you like to come in?"

Caller: "This Friday."

Aeris: "Perfect! And what time works best for you?"

Caller: "7:30 PM."

Aeris: "Great, 7:30 PM on Friday. How many people will be joining you?"

Caller: "Four people."

Aeris: "Wonderful! And what name should I put the reservation under?"

Caller: "Roger Rieder."

Aeris: "Excellent! So I have a reservation for Roger Rieder, party of 4, this Friday at 7:30 PM. Is that correct?"

Caller: "Yes, perfect."

Aeris: "Your reservation is confirmed! Is there anything else I can help you with?"

Caller: "No, that's all. Thank you!"

Aeris: "Thank you so much! We look forward to seeing you on Friday. Have a great day!"
```

**Expected Data Captured:**
- Name: Roger Rieder
- Party Size: 4
- Date: This Friday
- Time: 7:30 PM

---

## Restaurant Reservation - With Special Requests

**Scenario:** Birthday dinner with special needs

```
Aeris: "Hello! This is Aeris. How can I help you today?"

Caller: "Hi, I want to make a reservation for my wife's birthday."

Aeris: "How lovely! I'd be happy to help make it special. When would you like to celebrate?"

Caller: "Tomorrow evening at 8."

Aeris: "Perfect, tomorrow at 8 PM. How many guests will be joining you?"

Caller: "Just the two of us."

Aeris: "Romantic! And what name should I put the reservation under?"

Caller: "David Chen."

Aeris: "Great! And since it's a birthday celebration, is there anything special you'd like us to prepare? A dessert, perhaps?"

Caller: "Yes, actually. Do you have anything gluten-free? She has celiac disease."

Aeris: "Absolutely, we have several gluten-free options. I'll make a note that it's a birthday and that you'll need gluten-free accommodations. Would you prefer a window table or a quieter corner?"

Caller: "A quiet corner would be perfect."

Aeris: "Wonderful! So I have a reservation for David Chen, party of 2, tomorrow at 8 PM, noting it's a birthday celebration, gluten-free requirements, and you'd like a quiet corner table. Is that all correct?"

Caller: "Perfect, thank you!"

Aeris: "My pleasure! We'll make sure it's a special evening. Is there anything else?"

Caller: "No, that's everything."

Aeris: "Excellent! We look forward to celebrating with you tomorrow. Happy birthday to your wife!"
```

**Expected Data Captured:**
- Name: David Chen
- Party Size: 2
- Date: Tomorrow
- Time: 8 PM
- Special Requests: Birthday, gluten-free, quiet corner table

---

## Menu Inquiry

**Scenario:** Caller has questions before deciding

```
Aeris: "Hello! This is Aeris. How can I help you today?"

Caller: "Hi, I was thinking about making a reservation, but I wanted to ask about your menu first."

Aeris: "Of course! I'd be happy to help. What would you like to know?"

Caller: "Do you have vegetarian options?"

Aeris: "Yes, we have several wonderful vegetarian dishes. We have a seasonal vegetable risotto, grilled portobello steak, and a Mediterranean pasta that are all quite popular. Would you like to hear more about any of those?"

Caller: "The risotto sounds good. Is it vegan?"

Aeris: "The risotto is vegetarian but contains parmesan cheese, so it's not vegan as-is. However, our chef can easily modify it to be fully vegan using nutritional yeast instead. Would that work for you?"

Caller: "Perfect! Yes, I'd like to make a reservation then."

Aeris: "Wonderful! What day and time would you prefer?"

[Continue with reservation flow...]
```

**Expected Behavior:**
- Answer menu questions naturally
- Transition smoothly to reservation when ready
- Note dietary preferences for the kitchen

---

## Changing Reservation

**Scenario:** Caller needs to modify details mid-conversation

```
Aeris: "Hello! This is Aeris. How can I help you today?"

Caller: "I'd like to make a reservation for tonight at 7 PM."

Aeris: "Great! And how many people?"

Caller: "Six people. Wait, actually, can we make it 7:30 instead? Seven PM might be too early."

Aeris: "Of course! No problem at all. So 7:30 PM tonight for six people. What name should I put it under?"

Caller: "Sarah Johnson. Oh, and actually, it might be seven people, not six. Can I confirm the final count later?"

Aeris: "Absolutely! I'll put it down for seven people to be safe, and you can always let us know if it changes. Is there anything else you'd like to mention?"

Caller: "No, that's perfect. Thank you!"

Aeris: "You're welcome! So just to confirm: Sarah Johnson, party of 7, tonight at 7:30 PM. You can call anytime if you need to adjust the party size. Sound good?"

Caller: "Yes, perfect!"

Aeris: "Great! We'll see you tonight at 7:30. Have a wonderful day!"
```

**Expected Behavior:**
- Handle changes gracefully
- Confirm the updated information
- Stay flexible and accommodating

---

## Busy Restaurant / No Availability

**Scenario:** Requested time is not available

```
Aeris: "Hello! This is Aeris. How can I help you today?"

Caller: "Hi, I'd like a table for four tonight at 8 PM."

Aeris: "Tonight at 8 PM for four people—let me check our availability. I'm so sorry, but we're fully booked at 8 PM tonight. I do have openings at 6:30 PM or 9:30 PM. Would either of those times work for you?"

Caller: "Hmm, 9:30 is pretty late. What about tomorrow night?"

Aeris: "Let me check tomorrow for you. Yes! I have availability at 8 PM tomorrow night. Would that work better?"

Caller: "That's perfect!"

Aeris: "Wonderful! And what name should I put the reservation under?"

[Continue with standard flow...]
```

**Expected Behavior:**
- Apologize for unavailability
- Offer alternative times
- Be helpful and flexible

---

## Handling Interruptions

**Scenario:** Caller interrupts or talks over Aeris

```
Aeris: "Hello! This is Aeris. How can I—"

Caller: "Yeah, hi, I need a table for tonight."

Aeris: "Of course! What time would you like to come in?"

Caller: "7 o'clock. Is that—wait, do you have outdoor seating?"

Aeris: "Yes, we do have outdoor seating! Would you prefer to sit outside?"

Caller: "Yeah, if the weather's nice. What's it looking like?"

Aeris: "It's supposed to be a beautiful evening, so outdoor seating should be perfect! Let me get your reservation set up. Party of how many?"

Caller: "Three. No, wait—four. My brother might come."

Aeris: "No problem! I'll put you down for four at 7 PM, outdoor seating preferred. And your name?"

[Continue...]
```

**Expected Behavior:**
- Don't get flustered by interruptions
- Stay patient and friendly
- Adapt to conversational style
- Confirm details at the end

---

## Testing Checklist

When testing the system, try these scenarios:

### Basic Functionality
- [ ] Simple reservation (name, date, time, party size)
- [ ] Confirm details correctly
- [ ] Natural conversation flow
- [ ] Professional call ending

### Edge Cases
- [ ] Caller changes their mind mid-call
- [ ] Multiple special requests
- [ ] Unclear speech / mumblin
- [ ] Background noise
- [ ] Long pauses
- [ ] Caller interrupts

### Voice Quality
- [ ] Sounds human (not robotic)
- [ ] Natural pacing and pauses
- [ ] Appropriate emotional tone
- [ ] Clear pronunciation
- [ ] No awkward transitions

### Conversation Intelligence
- [ ] Understands context
- [ ] Remembers information from earlier in call
- [ ] Asks clarifying questions when needed
- [ ] Handles "um", "uh", filler words from caller
- [ ] Gracefully handles confusion

### Error Handling
- [ ] Poor audio quality
- [ ] Network interruption
- [ ] Unexpected responses
- [ ] Non-English words or names

---

## Feedback Template

After testing a call, use this template to provide feedback:

```
Call Date/Time: [timestamp]
Scenario Tested: [e.g., "Basic reservation"]

Voice Quality: [1-10]
- Comments: 

Understanding Accuracy: [1-10]
- What worked:
- What didn't:

Conversation Flow: [1-10]
- Natural moments:
- Awkward moments:

Response Time: [Acceptable / Too Slow / Too Fast]
- Average latency: ~[X] seconds

Issues Encountered:
1. 
2. 

Suggestions for Improvement:
1. 
2. 

Overall Rating: [1-10]
Would you believe this was a human?: [Yes / No / Maybe]
```

---

## Tips for Natural Testing

1. **Don't read from a script** - Talk naturally as you would on a real call
2. **Add realistic elements** - Use "um", "uh", pause to think, change your mind
3. **Test edge cases** - Be difficult, interrupt, ask weird questions
4. **Vary your pace** - Speak fast, slow, with accent, background noise
5. **Listen to voice quality** - Does it sound human? Would you believe it's a person?

---

Built for Roger Rieder by Aeris 🎙️
