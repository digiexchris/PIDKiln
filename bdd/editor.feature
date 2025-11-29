Feature: Program Editor
  As a user creating or modifying firing programs
  I want a full-featured text editor
  So that I can write and edit program files

  Background:
    Given the PIDKiln frontend is loaded in a browser
    And the WebSocket is connected

  @editor @navigation
  Scenario: Navigate to editor from Programs page
    Given I am on the Programs view
    When I click the "Edit" button for "program1.json"
    Then I should be on the Editor view
    And the URL hash should be "#/editor"

  @editor @display
  Scenario: Editor displays program content
    Given I am editing "program1.json"
    Then the editor should display the program JSON content
    And the filename "program1.json" should be shown in the toolbar
    And the editor should use a monospace font

  @editor @line-numbers
  Scenario: Editor shows line numbers
    Given I am editing a program
    Then line numbers should be displayed on the left side
    And line numbers should scroll with the content

  @editor @save
  Scenario: Save changes to a program
    Given I am editing "program1.json"
    And I have made changes to the content
    When I click the "Save" button
    Then the changes should be saved to the server
    And I should be navigated back to the Programs view

  @editor @cancel
  Scenario: Cancel editing without changes
    Given I am editing "program1.json"
    And I have not made any changes
    When I click the "Cancel" button
    Then I should be navigated back to the Programs view

  @editor @cancel @with-changes
  Scenario: Cancel editing with unsaved changes
    Given I am editing "program1.json"
    And I have made changes to the content
    When I click the "Cancel" button
    Then a confirmation dialog should appear asking to discard changes
    When I confirm discarding changes
    Then I should be navigated back to the Programs view

  @editor @cancel @keep-editing
  Scenario: Keep editing after cancel prompt
    Given I am editing "program1.json"
    And I have made changes to the content
    When I click the "Cancel" button
    And I cancel the discard confirmation dialog
    Then I should remain on the Editor view
    And my changes should still be present

  @editor @status-bar
  Scenario: Editor status bar shows file info
    Given I am editing a program
    Then the editor status bar should show the line count
    And the editor status bar should show the byte count

  @editor @validation
  Scenario: File size validation
    Given I am editing a program
    When the content exceeds 10KB
    Then a warning should be displayed
    And the Save button should be disabled

  @editor @new-program
  Scenario: Create a new program
    Given I am on the Programs view
    When I click the "New Program" button
    Then a prompt should ask for the program filename
    When I enter "my_program.json" as the filename
    Then I should be on the Editor view
    And the editor should contain a template JSON structure with:
      | field       | value                           |
      | description | "Program description"           |
      | segments    | Array with one sample segment   |

