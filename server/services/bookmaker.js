// server/services/bookmaker.js - Author merging and book management
const queries = require('../db/queries');
const { generateBookTitle } = require('./llm');
const logger = require('../utils/logger');

async function processBook(entryData) {
    const { author, author_id, platform, category } = entryData;

    if (!author) return null; // No author → no book

    // Find existing book for this author+platform
    let book = queries.findBook({ author_id, author, platform });

    if (!book) {
        // Create a new book
        book = queries.createBook({
            author,
            author_id: author_id || null,
            platform,
            category,
            title: author ? `${author} 的内容` : '未知作者的内容',
            cover_url: entryData.cover_url || null,
            cover_local: entryData.cover_local || null,
        });
        logger.info(`Created new book: "${book.title}" for author "${author}"`);
    } else {
        // Update book count and possibly cover
        const newCount = (book.entry_count || 0) + 1;
        const updates = { entry_count: newCount };

        // Try to generate a better book title when we have 2+ entries
        if (newCount >= 2) {
            try {
                // Get existing entries for this book
                const existingEntries = queries.getBookEntries(book.id);
                const allEntries = [...existingEntries, { title: entryData.title, url: entryData.url }];
                const newTitle = await generateBookTitle(allEntries.map(e => ({ ...e, author })));
                if (newTitle) updates.title = newTitle;
            } catch (err) {
                logger.debug(`Book title generation failed: ${err.message}`);
            }
        }

        // Use first entry's cover if book has none
        if (!book.cover_url && entryData.cover_url) {
            updates.cover_url = entryData.cover_url;
        }
        if (!book.cover_local && entryData.cover_local) {
            updates.cover_local = entryData.cover_local;
        }

        queries.updateBook(book.id, updates);
        book = queries.getBookById(book.id);
        logger.info(`Updated book "${book.title}" (${newCount} entries)`);
    }

    return book;
}

module.exports = { processBook };
